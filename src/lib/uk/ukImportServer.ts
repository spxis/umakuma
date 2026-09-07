import "server-only";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { prisma } from "@/lib/prisma";
import { parseAssignmentCacheRows } from "@/lib/wanikani/helpers";

import { planWanikaniImport, type UkImportPlan, type WanikaniAssignment } from "./ukImport";
import { raiseUnLevelFloor, unLevelTotals } from "./unLevelServer";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

/**
 * Reading a member's WaniKani progress off the cache and onto our ladder.
 *
 * The cache, not the API: `Account.assignmentCache` holds the whole
 * `/assignments` collection and the ordinary five-minute sync keeps it fresh.
 * Asking WaniKani for three thousand assignments at import time would be slow
 * and would fail for exactly the member whose token has just lapsed.
 */

function toDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toAssignments(cache: unknown): WanikaniAssignment[] {
  return parseAssignmentCacheRows(cache)
    .map((row) => {
      const data = row.data;
      return {
        subjectId: typeof data.subject_id === "number" ? data.subject_id : -1,
        srsStage: typeof data.srs_stage === "number" ? data.srs_stage : 0,
        unlockedAt: toDate(data.unlocked_at),
        startedAt: toDate(data.started_at),
        passedAt: toDate(data.passed_at),
        burnedAt: toDate(data.burned_at),
        availableAt: toDate(data.available_at),
      };
    })
    .filter((assignment) => assignment.subjectId > 0);
}

export type UkImportResult = UkImportPlan["summary"] & {
  /** What arriving with this much knowledge paid. Empty when nothing was owed. */
  xpEarned?: { xp: number; reason: string }[];
  floor: number;
  level: number;
  /** Null when the member has no WaniKani data to import. */
  wkLevel: number | null;
};

/** What an import would do, without doing it. */
export async function planUkImport(accountId: string): Promise<{ plan: UkImportPlan; wkLevel: number | null } | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { assignmentCache: true, wkLevel: true },
  });
  if (!account) return null;

  const assignments = toAssignments(account.assignmentCache);
  if (assignments.length === 0) return null;

  const [targets, totals, existingRows] = await Promise.all([
    prisma.ukSubject.findMany({
      where: { wkSubjectId: { not: null }, removedAt: null },
      select: { id: true, wkSubjectId: true, kind: true, level: true },
    }),
    unLevelTotals(LADDER_STREAMS.un),
    prisma.ukSrsState.findMany({
      where: { accountId },
      select: { subjectId: true, srsStage: true, lastReviewedAt: true },
    }),
  ]);

  const plan = planWanikaniImport({
    assignments,
    targets: targets.map((target) => ({
      subjectId: target.id,
      wkSubjectId: target.wkSubjectId as number,
      kind: target.kind,
      level: target.level,
    })),
    totals,
    existing: new Map(existingRows.map((row) => [row.subjectId, row])),
    maxLevel: KANJI_LADDER_LEVELS,
  });

  return { plan, wkLevel: account.wkLevel };
}

/**
 * Applies the plan.
 *
 * Upserted one at a time rather than `createMany`, because an import may be
 * run again later and the point of the second run is to update rows the first
 * one wrote. Chunked so a three-thousand-row import does not hold one
 * transaction open for the whole of it.
 */
export async function importWanikaniProgress(accountId: string): Promise<UkImportResult | null> {
  const planned = await planUkImport(accountId);
  if (!planned) return null;

  const { plan, wkLevel } = planned;
  const CHUNK = 200;
  for (let at = 0; at < plan.states.length; at += CHUNK) {
    await prisma.$transaction(
      plan.states.slice(at, at + CHUNK).map((state) =>
        prisma.ukSrsState.upsert({
          where: { accountId_subjectId: { accountId, subjectId: state.subjectId } },
          create: { accountId, ...state, origin: "wanikani" },
          update: {
            srsStage: state.srsStage,
            unlockedAt: state.unlockedAt,
            startedAt: state.startedAt,
            passedAt: state.passedAt,
            burnedAt: state.burnedAt,
            availableAt: state.availableAt,
            origin: "wanikani",
          },
        }),
      ),
    );
  }

  const resolved = await raiseUnLevelFloor({ accountId, floor: plan.floor, source: "wanikani" });
  /* The placement award rides back with the level, so the page that started
     the import can say what arriving with this much knowledge was worth. */
  return { ...plan.summary, floor: plan.floor, level: resolved.level, wkLevel, xpEarned: resolved.earned ?? [] };
}
