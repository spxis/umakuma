import "server-only";

import { prisma } from "@/lib/prisma";

import { parseAssignmentCacheRows } from "./helpers";
import type { AssignmentCacheRow } from "./types";

/**
 * Offline stand-in for the WaniKani API, used by the local development setup.
 *
 * Requests are answered from the local database instead of the network: subjects
 * replay `WkSubjectCatalog.rawData` (the original WaniKani payload, so shapes are
 * exact) and assignments come from the account's `assignmentCache`. Review
 * submissions write back to that cache, so the study loop behaves like the real
 * thing without a token.
 *
 * Enabling it requires WANIKANI_MOCK=1 **and** the absence of Vercel's own
 * environment variable, so it cannot be switched on in a deployed environment.
 * Each local account stores `local-mock:<accountId>` as its token, which is how
 * a request is attributed to an account.
 */
export const WANIKANI_MOCK_TOKEN_PREFIX = "local-mock:";

export function isWaniKaniMockEnabled(): boolean {
  return process.env.WANIKANI_MOCK === "1" && !process.env.VERCEL;
}

export function mockTokenForAccount(accountId: string): string {
  return `${WANIKANI_MOCK_TOKEN_PREFIX}${accountId}`;
}

function accountIdFromToken(token: string): string | null {
  return token.startsWith(WANIKANI_MOCK_TOKEN_PREFIX)
    ? token.slice(WANIKANI_MOCK_TOKEN_PREFIX.length)
    : null;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", etag: `W/"mock-${Date.now()}"` },
  });
}

function collection(data: AssignmentCacheRow[] | Array<Record<string, unknown>>): Response {
  return jsonResponse({
    object: "collection",
    data_updated_at: new Date().toISOString(),
    pages: { next_url: null },
    total_count: data.length,
    data,
  });
}

function numberList(value: string | null): number[] {
  if (!value) return [];
  return value.split(",").map((part) => Number(part.trim())).filter(Number.isFinite);
}

function stringList(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

type AssignmentData = {
  subject_id?: unknown;
  subject_type?: unknown;
  srs_stage?: unknown;
  available_at?: unknown;
  started_at?: unknown;
};

function readAssignment(row: AssignmentCacheRow) {
  const data = row.data as AssignmentData;
  return {
    subjectId: typeof data.subject_id === "number" ? data.subject_id : null,
    subjectType: typeof data.subject_type === "string" ? data.subject_type : null,
    srsStage: typeof data.srs_stage === "number" ? data.srs_stage : null,
    availableAt: typeof data.available_at === "string" ? data.available_at : null,
    startedAt: typeof data.started_at === "string" ? data.started_at : null,
  };
}

async function loadAccount(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, wkUserId: true, wkUsername: true, wkLevel: true, assignmentCache: true },
  });
  if (!account) return null;
  return { ...account, rows: parseAssignmentCacheRows(account.assignmentCache) };
}

async function subjectsResponse(params: URLSearchParams): Promise<Response> {
  const ids = numberList(params.get("ids"));
  const types = stringList(params.get("types"));
  const levels = numberList(params.get("levels"));

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: {
      ...(ids.length > 0 ? { wkSubjectId: { in: ids } } : {}),
      ...(types.length > 0 ? { subjectType: { in: types } } : {}),
      ...(levels.length > 0 ? { level: { in: levels } } : {}),
    },
    select: { wkSubjectId: true, subjectType: true, dataUpdatedAt: true, rawData: true },
    // Unbounded catalog reads would be enormous; every caller filters.
    take: ids.length > 0 || levels.length > 0 ? 1000 : 200,
  });

  // rawData holds the inner WaniKani `data` object, not the whole envelope, so
  // rebuild the envelope around it.
  return collection(rows.map((row) => ({
    id: row.wkSubjectId,
    object: row.subjectType,
    data_updated_at: row.dataUpdatedAt.toISOString(),
    data: (row.rawData as Record<string, unknown> | null) ?? {},
  })));
}

function filterAssignments(rows: AssignmentCacheRow[], params: URLSearchParams): AssignmentCacheRow[] {
  const ids = numberList(params.get("ids"));
  const srsStages = numberList(params.get("srs_stages"));
  const subjectTypes = stringList(params.get("subject_types"));
  const levels = numberList(params.get("levels"));
  const immediate = params.get("immediately_available_for_review") === "true";
  const updatedAfter = params.get("updated_after");
  const nowMs = Date.now();

  return rows.filter((row) => {
    const item = readAssignment(row);
    if (ids.length > 0 && !ids.includes(row.id)) return false;
    if (srsStages.length > 0 && (item.srsStage === null || !srsStages.includes(item.srsStage))) return false;
    if (subjectTypes.length > 0 && (!item.subjectType || !subjectTypes.includes(item.subjectType))) return false;
    if (immediate) {
      if (!item.availableAt || Date.parse(item.availableAt) > nowMs) return false;
      if (item.srsStage === null || item.srsStage < 1 || item.srsStage > 8) return false;
    }
    if (updatedAfter && row.data_updated_at && Date.parse(row.data_updated_at) <= Date.parse(updatedAfter)) {
      return false;
    }
    if (levels.length > 0) return true; // level lives on the subject, not the assignment
    return true;
  });
}

/**
 * Applies a review the way WaniKani would: a correct answer advances one stage,
 * an incorrect answer drops back, and the next availability moves out.
 */
async function submitReview(accountId: string, body: unknown): Promise<Response> {
  const payload = (body as { review?: Record<string, unknown> } | null)?.review ?? {};
  // WaniKani accepts either key; the study route submits assignment_id.
  const assignmentId = Number(payload.assignment_id);
  const requestedSubjectId = Number(payload.subject_id);
  const incorrectMeaning = Number(payload.incorrect_meaning_answers ?? 0);
  const incorrectReading = Number(payload.incorrect_reading_answers ?? 0);
  const passed = incorrectMeaning === 0 && incorrectReading === 0;

  const account = await loadAccount(accountId);
  if (!account) return new Response("not found", { status: 404 });

  const target = account.rows.find((row) =>
    Number.isFinite(assignmentId)
      ? row.id === assignmentId
      : readAssignment(row).subjectId === requestedSubjectId,
  );
  if (!target) {
    return new Response(JSON.stringify({ error: "assignment not found" }), { status: 404 });
  }
  const subjectId = readAssignment(target).subjectId;
  const subjectType = readAssignment(target).subjectType ?? "kanji";

  let starting = 0;
  let ending = 0;
  const nextRows = account.rows.map((row) => {
    const item = readAssignment(row);
    if (row.id !== target.id) return row;
    starting = item.srsStage ?? 0;
    ending = Math.max(1, Math.min(9, passed ? starting + 1 : starting - 2));
    const hours = ending >= 9 ? 0 : [0, 4, 8, 24, 48, 168, 336, 720, 2880][ending] ?? 24;
    return {
      ...row,
      data_updated_at: new Date().toISOString(),
      data: {
        ...row.data,
        srs_stage: ending,
        available_at: ending >= 9 ? null : new Date(Date.now() + hours * 3_600_000).toISOString(),
        passed_at: ending >= 5 ? new Date().toISOString() : row.data.passed_at ?? null,
        burned_at: ending >= 9 ? new Date().toISOString() : null,
      },
    };
  });

  await prisma.account.update({
    where: { id: accountId },
    data: { assignmentCache: nextRows as never, assignmentCacheUpdatedAt: new Date() },
  });

  return jsonResponse({
    id: Math.floor(Math.random() * 1_000_000),
    object: "review",
    data: {
      subject_id: subjectId,
      starting_srs_stage: starting,
      ending_srs_stage: ending,
      created_at: new Date().toISOString(),
    },
    // The study route reads the updated assignment and statistic from here.
    resources_updated: {
      assignment: {
        id: target.id,
        object: "assignment",
        data: { subject_id: subjectId, subject_type: subjectType, srs_stage: ending },
      },
      review_statistic: {
        id: target.id,
        object: "review_statistic",
        data: {
          subject_id: subjectId,
          subject_type: subjectType,
          meaning_correct: passed ? 5 : 4,
          meaning_incorrect: passed ? 1 : 2,
          meaning_current_streak: passed ? 3 : 0,
          meaning_max_streak: 4,
          reading_correct: passed ? 5 : 4,
          reading_incorrect: passed ? 1 : 2,
          reading_current_streak: passed ? 3 : 0,
          reading_max_streak: 4,
          percentage_correct: passed ? 83 : 66,
        },
      },
    },
  });
}

export async function mockWaniKaniFetch(
  path: string,
  init: { method?: string; body?: unknown } | undefined,
  token: string,
): Promise<Response> {
  const accountId = accountIdFromToken(token);
  if (!accountId) {
    return new Response(JSON.stringify({ error: "mock token missing account id" }), { status: 401 });
  }

  const url = new URL(`https://mock.local${path}`);
  const params = url.searchParams;
  const method = (init?.method ?? "GET").toUpperCase();

  if (method === "POST" && url.pathname.startsWith("/reviews")) {
    const parsed = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body;
    return submitReview(accountId, parsed);
  }

  const account = await loadAccount(accountId);
  if (!account) return new Response(JSON.stringify({ error: "account not found" }), { status: 404 });

  if (url.pathname === "/user") {
    return jsonResponse({
      data: { id: account.wkUserId, username: account.wkUsername, level: account.wkLevel },
    });
  }

  if (url.pathname === "/subjects") {
    return subjectsResponse(params);
  }

  if (url.pathname === "/assignments") {
    return collection(filterAssignments(account.rows, params));
  }

  if (url.pathname === "/summary") {
    const nowMs = Date.now();
    const due = account.rows.flatMap((row) => {
      const item = readAssignment(row);
      if (!item.availableAt || item.srsStage === null || item.srsStage < 1 || item.srsStage > 8) return [];
      return [{ availableAt: item.availableAt, subjectId: item.subjectId! }];
    });
    const buckets = new Map<string, number[]>();
    for (const entry of due) {
      // WaniKani reports everything already due in a single now bucket.
      const key = Date.parse(entry.availableAt) <= nowMs
        ? new Date(nowMs).toISOString()
        : entry.availableAt;
      buckets.set(key, [...(buckets.get(key) ?? []), entry.subjectId]);
    }
    return jsonResponse({
      data: {
        reviews: [...buckets.entries()].map(([available_at, subject_ids]) => ({ available_at, subject_ids })),
      },
    });
  }

  if (url.pathname === "/review_statistics") {
    const started = account.rows.filter((row) => readAssignment(row).startedAt !== null);
    return collection(started.map((row) => {
      const item = readAssignment(row);
      return {
        id: row.id,
        object: "review_statistic",
        data_updated_at: new Date().toISOString(),
        data: {
          subject_id: item.subjectId,
          subject_type: item.subjectType,
          meaning_correct: 4, meaning_incorrect: 1, meaning_max_streak: 4, meaning_current_streak: 2,
          reading_correct: 4, reading_incorrect: 1, reading_max_streak: 4, reading_current_streak: 2,
          percentage_correct: 80,
        },
      };
    }));
  }

  return collection([]);
}
