import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  getCachedStudyQueue,
  getCachedStudyQueueSyncState,
  setCachedStudyQueue,
  setCachedStudyQueueSyncState,
} from "@/lib/studyQueueCache";
import { srsLabel } from "@/lib/wanikani/helpers";
import { fetchAllCollectionPages, fetchWaniKani } from "@/lib/wanikani/http";
import type { WaniKaniCollectionResponse } from "@/lib/wanikani/types";
import {
  ASSIGNMENT_CHUNK_SIZE,
  ASSIGNMENT_FULL_RESYNC_MS,
  SUBJECT_CACHE_TTL_MS,
  buildImmediateAssignmentsPath,
  fetchAssignmentCount,
  hydrateMissingSubjects,
  modePathParam,
  normalizeSubjectType,
  queueRowsFromState,
  toAssignmentRows,
  trimSubjectCache,
  type AssignmentData,
  type AssignmentRow,
  type CachedSubjectRow,
  type QueueMode,
  type QueueSyncState,
  type SubjectData,
} from "./queueRouteUtils";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

async function fetchEligibleAssignmentIds(
  token: string,
  mode: QueueMode,
  assignmentIds: number[],
): Promise<Set<number>> {
  const output = new Set<number>();

  for (let i = 0; i < assignmentIds.length; i += ASSIGNMENT_CHUNK_SIZE) {
    const chunk = assignmentIds.slice(i, i + ASSIGNMENT_CHUNK_SIZE).join(",");
    if (!chunk) {
      continue;
    }

    const collection = await fetchAllCollectionPages(
      `/assignments?ids=${chunk}&${modePathParam(mode)}`,
      token,
    );

    for (const row of collection.data) {
      output.add(row.id);
    }
  }

  return output;
}

async function hydrateQueueSyncState(
  accountId: string,
  mode: QueueMode,
  token: string,
): Promise<QueueSyncState> {
  const nowMs = Date.now();
  const cachedState = getCachedStudyQueueSyncState(accountId, mode);
  const assignmentById = new Map<number, AssignmentRow>();
  const subjectById = new Map<number, CachedSubjectRow>();

  if (cachedState) {
    for (const [id, row] of cachedState.assignmentById.entries()) {
      assignmentById.set(id, row as AssignmentRow);
    }

    for (const [id, row] of cachedState.subjectById.entries()) {
      subjectById.set(id, row as CachedSubjectRow);
    }
  }

  let assignmentCheckpoint = cachedState?.assignmentCheckpoint ?? null;
  const shouldFullResync =
    !cachedState ||
    !assignmentCheckpoint ||
    nowMs - cachedState.lastFullSyncAtMs > ASSIGNMENT_FULL_RESYNC_MS;
  let lastFullSyncAtMs = cachedState?.lastFullSyncAtMs ?? 0;

  if (shouldFullResync) {
    assignmentById.clear();
    const fullCollection = await fetchAllCollectionPages(buildImmediateAssignmentsPath(mode), token);
    for (const row of toAssignmentRows(fullCollection)) {
      assignmentById.set(row.id, row);
    }

    assignmentCheckpoint = fullCollection.data_updated_at ?? assignmentCheckpoint;
    lastFullSyncAtMs = nowMs;
  } else if (assignmentCheckpoint) {
    const updates = await fetchAllCollectionPages(
      `/assignments?updated_after=${encodeURIComponent(assignmentCheckpoint)}`,
      token,
    );
    const updatedRows = toAssignmentRows(updates);

    if (updatedRows.length > 0) {
      const eligibleUpdatedIds = await fetchEligibleAssignmentIds(
        token,
        mode,
        updatedRows.map((row) => row.id),
      );

      for (const row of updatedRows) {
        if (eligibleUpdatedIds.has(row.id)) {
          assignmentById.set(row.id, row);
        } else {
          assignmentById.delete(row.id);
        }
      }
    }

    assignmentCheckpoint = updates.data_updated_at ?? assignmentCheckpoint;
  }

  const queueSubjectIds = new Set<number>();
  for (const row of assignmentById.values()) {
    queueSubjectIds.add(row.data.subject_id);
  }

  const staleOrMissingSubjectIds = Array.from(queueSubjectIds).filter((subjectId) => {
    const existing = subjectById.get(subjectId);
    if (!existing) {
      return true;
    }

    return nowMs - existing.fetchedAtMs > SUBJECT_CACHE_TTL_MS;
  });

  for (let i = 0; i < staleOrMissingSubjectIds.length; i += ASSIGNMENT_CHUNK_SIZE) {
    const chunk = staleOrMissingSubjectIds.slice(i, i + ASSIGNMENT_CHUNK_SIZE).join(",");
    if (!chunk) {
      continue;
    }

    const subjectCollection = await fetchAllCollectionPages(`/subjects?ids=${chunk}`, token);
    for (const row of subjectCollection.data) {
      subjectById.set(row.id, {
        object: row.object ?? "subject",
        data: row.data as SubjectData,
        fetchedAtMs: nowMs,
      });
    }
  }

  trimSubjectCache(subjectById, queueSubjectIds);

  setCachedStudyQueueSyncState(accountId, mode, {
    assignmentById: assignmentById as Map<number, unknown>,
    subjectById: subjectById as Map<number, unknown>,
    assignmentCheckpoint,
    lastFullSyncAtMs,
  });

  return {
    assignmentById,
    subjectById,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const url = new URL(request.url);
    const modeParam = url.searchParams.get("mode");
    const mode = modeParam === "lesson" ? "lesson" : modeParam === "all" ? "all" : "review";
    const limitParam = Number(url.searchParams.get("limit") ?? "");
    const offsetParam = Number(url.searchParams.get("offset") ?? "");
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : null;
    const offset = Number.isInteger(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    const { accountId } = await context.params;
    if (!(await canAccessAccount(request, accountId))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        tokenEncrypted: true,
        tokenIv: true,
        tokenTag: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const token = decryptToken({
      encrypted: account.tokenEncrypted,
      iv: account.tokenIv,
      tag: account.tokenTag,
    });

    const cached = getCachedStudyQueue(accountId, mode);
    if (cached) {
      const cachedItems = cached.items as Array<{
        queueType: "review" | "lesson";
      }>;
      const pagedItems = limit === null ? cachedItems : cachedItems.slice(offset, offset + limit);

      return NextResponse.json(
        {
          items: pagedItems,
          counts: cached.counts,
          pagination: {
            offset,
            limit: limit ?? cachedItems.length,
            total: cachedItems.length,
            hasMore: limit === null ? false : offset + limit < cachedItems.length,
          },
          cached: true,
        },
        {
          headers: {
            "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
          },
        },
      );
    }

    const reviewState =
      mode === "lesson" ? null : await hydrateQueueSyncState(accountId, "review", token);
    const lessonState =
      mode === "review" ? null : await hydrateQueueSyncState(accountId, "lesson", token);

    const reviewAssignments = reviewState ? queueRowsFromState(reviewState, "review") : [];
    const lessonAssignments = lessonState ? queueRowsFromState(lessonState, "lesson") : [];
    const queued =
      mode === "all"
        ? [...reviewAssignments, ...lessonAssignments]
        : mode === "lesson"
          ? lessonAssignments
          : reviewAssignments;

    const subjectById = new Map<number, { object: string; data: SubjectData }>();
    if (reviewState) {
      for (const [subjectId, row] of reviewState.subjectById.entries()) {
        subjectById.set(subjectId, { object: row.object, data: row.data });
      }
    }

    if (lessonState) {
      for (const [subjectId, row] of lessonState.subjectById.entries()) {
        subjectById.set(subjectId, { object: row.object, data: row.data });
      }
    }

    const relatedSubjectIds = new Set<number>();
    for (const row of queued) {
      const subject = subjectById.get(row.data.subject_id)?.data;
      if (!subject) {
        continue;
      }

      for (const subjectId of subject.component_subject_ids ?? []) {
        relatedSubjectIds.add(subjectId);
      }

      for (const subjectId of subject.amalgamation_subject_ids ?? []) {
        relatedSubjectIds.add(subjectId);
      }

      for (const subjectId of subject.visually_similar_subject_ids ?? []) {
        relatedSubjectIds.add(subjectId);
      }
    }

    if (relatedSubjectIds.size > 0) {
      await hydrateMissingSubjects(token, subjectById, Array.from(relatedSubjectIds));
    }

    const kanjiChars = Array.from(
      new Set(
        queued
          .filter((row) => normalizeSubjectType(row.data.subject_type) === "kanji")
          .map((row) => subjectById.get(row.data.subject_id)?.data.characters)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const jlptRows =
      kanjiChars.length > 0
        ? await prisma.jlptKanji.findMany({
            where: { kanji: { in: kanjiChars } },
            select: {
              kanji: true,
              nLevel: true,
              primaryMeaning: true,
              meanings: true,
              onReadings: true,
              kunReadings: true,
              nanoriReadings: true,
              wordExamples: true,
              strokeCount: true,
              frequencyRank: true,
              schoolGrade: true,
              heisigKeyword: true,
            },
          })
        : [];
    const jlptByKanji = new Map(jlptRows.map((row) => [row.kanji, row]));

    const relatedReferenceFromId = (subjectId: number) => {
      const related = subjectById.get(subjectId);
      const meaning =
        (related?.data.meanings ?? [])
          .find((item) => (item.primary ?? true) && typeof item.meaning === "string" && item.meaning.length > 0)
          ?.meaning ??
        (related?.data.meanings ?? [])
          .find((item) => typeof item.meaning === "string" && item.meaning.length > 0)
          ?.meaning ??
        null;

      const reading =
        (related?.data.readings ?? [])
          .find((item) => item.primary && (item.accepted_answer ?? true))
          ?.reading ??
        null;

      return {
        subjectId,
        label: related?.data.characters ?? related?.data.slug ?? String(subjectId),
        wkLevel: typeof related?.data.level === "number" ? related.data.level : null,
        reading,
        meaning,
      };
    };

    const items = queued
      .map((row) => {
        const subject = subjectById.get(row.data.subject_id);
        const subjectData = subject?.data;
        const subjectType = normalizeSubjectType(row.data.subject_type);
        const label = subjectData?.characters ?? subjectData?.slug ?? `#${row.data.subject_id}`;
        const meanings = (subjectData?.meanings ?? []).map((item) => item.meaning);
        const readings = (subjectData?.readings ?? [])
          .filter((item) => item.accepted_answer ?? true)
          .map((item) => item.reading);
        const primaryReadings = (subjectData?.readings ?? [])
          .filter((item) => item.primary)
          .map((item) => item.reading);

        const componentSubjectIds = subjectData?.component_subject_ids ?? [];
        const amalgamationSubjectIds = subjectData?.amalgamation_subject_ids ?? [];
        const visuallySimilarSubjectIds = subjectData?.visually_similar_subject_ids ?? [];

        const radicals =
          subjectType === "kanji"
            ? componentSubjectIds
                .filter((subjectId) => subjectById.get(subjectId)?.object === "radical")
                .map(relatedReferenceFromId)
            : [];

        const usedInVocabulary =
          subjectType === "kanji"
            ? amalgamationSubjectIds
                .filter((subjectId) => subjectById.get(subjectId)?.object === "vocabulary")
                .map(relatedReferenceFromId)
            : [];

        const visuallySimilar =
          subjectType === "kanji"
            ? visuallySimilarSubjectIds.map(relatedReferenceFromId)
            : [];

        const componentKanji =
          subjectType === "vocabulary"
            ? componentSubjectIds
                .filter((subjectId) => subjectById.get(subjectId)?.object === "kanji")
                .map(relatedReferenceFromId)
            : [];

        const jlpt = subjectType === "kanji" ? jlptByKanji.get(subjectData?.characters ?? "") : null;
        const jlptMeta = jlpt
          ? {
              primaryMeaning: jlpt.primaryMeaning,
              meanings: jlpt.meanings,
              onReadings: jlpt.onReadings,
              kunReadings: jlpt.kunReadings,
              nanoriReadings: jlpt.nanoriReadings,
              wordExamples: jlpt.wordExamples,
              strokeCount: jlpt.strokeCount,
              frequencyRank: jlpt.frequencyRank,
              schoolGrade: jlpt.schoolGrade,
              heisigKeyword: jlpt.heisigKeyword,
            }
          : null;

        return {
          subjectId: row.data.subject_id,
          assignmentId: row.assignmentId,
          queueType: row.queueType,
          subjectType,
          wkLevel: subjectData?.level ?? null,
          characters: label,
          meanings,
          readings,
          primaryReadings,
          radicals,
          visuallySimilar,
          usedInVocabulary,
          componentKanji,
          meaningExplanation: subjectData?.meaning_mnemonic ?? "",
          readingExplanation: subjectData?.reading_mnemonic ?? "",
          jlptLevel: jlpt?.nLevel ?? null,
          jlptMeta,
          srsStage: row.data.srs_stage,
          status: srsLabel(row.data.srs_stage, row.data.srs_stage <= 0 || !row.data.unlocked_at),
          startedAt: row.data.started_at,
          passedAt: row.data.passed_at,
          availableAt: row.data.available_at,
        };
      })
      .sort((a, b) => {
        const aReview = a.queueType === "review" ? 0 : 1;
        const bReview = b.queueType === "review" ? 0 : 1;
        if (aReview !== bReview) {
          return aReview - bReview;
        }

        const aLevel = a.wkLevel ?? 999;
        const bLevel = b.wkLevel ?? 999;
        if (aLevel !== bLevel) {
          return aLevel - bLevel;
        }

        return a.subjectId - b.subjectId;
      });

    const counts =
      mode === "all"
        ? {
            all: items.length,
          reviews: reviewAssignments.length,
          lessons: lessonAssignments.length,
          }
        : mode === "lesson"
          ? {
              lessons: items.length,
              reviews: await fetchAssignmentCount("/assignments?immediately_available_for_review=true", token),
              all: 0,
            }
          : {
              reviews: items.length,
              lessons: await fetchAssignmentCount("/assignments?immediately_available_for_lessons=true", token),
              all: 0,
            };

    counts.all = counts.reviews + counts.lessons;

    setCachedStudyQueue(accountId, mode, items, counts);

    const pagedItems = limit === null ? items : items.slice(offset, offset + limit);

    return NextResponse.json(
      {
        items: pagedItems,
        counts,
        pagination: {
          offset,
          limit: limit ?? items.length,
          total: items.length,
          hasMore: limit === null ? false : offset + limit < items.length,
        },
        cached: false,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
        },
      },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not fetch study queue." }, { status: 500 });
  }
}
