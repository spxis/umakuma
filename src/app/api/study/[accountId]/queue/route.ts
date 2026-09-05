import { NextResponse } from "next/server";

import { loadStudyAccount } from "@/lib/accountAccess";
import { confusableWarnings } from "@/lib/kanjiConfusableWarning";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  WANIKANI_REQUIRED_MESSAGE,
  WANIKANI_REQUIRED_STATUS,
  wanikaniConnection,
} from "@/lib/wanikaniConnection";
import { prisma } from "@/lib/prisma";
import { preferOfficialReadings } from "@/lib/joyoReadings";
import { applyReviewSuccessRates, withReviewSuccessRates } from "@/lib/reviewSuccessRates";
import { getCachedStudyQueue, setCachedStudyQueue } from "@/lib/studyQueueCache";
import { cachedStudyQueueResponse } from "./queueRouteCachedResponse";
import { QUEUE_TYPES, SUBJECT_TYPES } from "@/lib/domainConstants";
import { srsLabel } from "@/lib/wanikani/helpers";
import { hydrateMissingSubjects, normalizeSubjectType, queueRowsFromState, type SubjectData } from "./queueRouteUtils";
import { hydrateQueueSyncState } from "./queueRouteSync";
import { mergeTroubleRows, troubleInjectionCount, type StudySubjectTagMap } from "./queueRouteTags";
import { fetchStudyTagRows } from "@/lib/studySubjectTags";
import { parseReviewDifficultySort, sortQueueRows } from "./queueRouteDifficulty";
import { resolveSubjectGlyph } from "@/lib/radicalGlyphs";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/queue",
    method: "GET",
    request,
    execute: async () => {
      try {
        const url = new URL(request.url);
        const parsedDifficultySort = parseReviewDifficultySort(url.searchParams.get("sort"));
        if (!parsedDifficultySort.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }
        const modeParam = url.searchParams.get("mode");
        const mode =
          modeParam === QUEUE_TYPES.lesson
            ? QUEUE_TYPES.lesson
            : modeParam === "all"
              ? "all"
              : QUEUE_TYPES.review;
        const limitParam = Number(url.searchParams.get("limit") ?? "");
        const offsetParam = Number(url.searchParams.get("offset") ?? "");
        const includeTrouble = url.searchParams.get("includeTrouble") === "1";
        const includeReviewed = mode !== QUEUE_TYPES.lesson && url.searchParams.get("includeReviewed") === "1";
        const difficultySort = mode === QUEUE_TYPES.review ? parsedDifficultySort.data : undefined;
        const tagFilter = url.searchParams.get("tag") === "favorite"
          ? "favorite"
          : url.searchParams.get("tag") === "trouble"
            ? "trouble"
            : "all";
        const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : null;
        const offset = Number.isInteger(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
        /*
         * The cache always holds the whole sorted queue, because only an
         * unlimited request may write it. That makes it readable by a paged
         * request too — slicing the full list gives exactly the page asked
         * for — and paged requests are what the page actually opens with, so
         * gating reads on `limit === null` meant the common path never hit it.
         * Staleness is covered: every mutation clears the cache, and it also
         * expires on its own after a minute.
         */
        const canWriteServerCache = limit === null;

    const { accountId } = await context.params;
    /* One read: the access decision and the token come together. */
    const { allowed, account } = await loadStudyAccount(request, accountId);
    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

        if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const connection = wanikaniConnection(account);
                if (!connection) {
                  return NextResponse.json(
                    { error: WANIKANI_REQUIRED_MESSAGE },
                    { status: WANIKANI_REQUIRED_STATUS },
                  );
                }
                const token = connection.token;

    const cacheVariant = mode === QUEUE_TYPES.review ? `trouble:${includeTrouble ? "1" : "0"}:reviewed:${includeReviewed ? "1" : "0"}:sort:${difficultySort ?? "default"}` : "default";
    const cached = getCachedStudyQueue(accountId, mode, cacheVariant);
    if (cached) {
      return cachedStudyQueueResponse(cached, offset, limit);
    }

    const reviewState = mode === QUEUE_TYPES.lesson ? null : await hydrateQueueSyncState(accountId, QUEUE_TYPES.review, token);
    const reviewedState = includeReviewed ? await hydrateQueueSyncState(accountId, QUEUE_TYPES.review, token, { includeReviewed: true }) : null;
    const lessonState =
      mode === QUEUE_TYPES.review ? null : await hydrateQueueSyncState(accountId, QUEUE_TYPES.lesson, token);

    const reviewAssignments = reviewState ? queueRowsFromState(reviewState, QUEUE_TYPES.review) : [];
    const reviewedAssignmentIds = new Set(reviewAssignments.map((row) => row.assignmentId));
    const reviewedAssignments = reviewedState
      ? queueRowsFromState(reviewedState, QUEUE_TYPES.review).filter((row) => !reviewedAssignmentIds.has(row.assignmentId)).map((row) => ({ ...row, data: { ...row.data, srs_stage: 0, unlocked_at: null, available_at: null } }))
      : [];
    const lessonAssignments = lessonState ? queueRowsFromState(lessonState, QUEUE_TYPES.lesson) : [];
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
    if (reviewedState) {
      for (const [subjectId, row] of reviewedState.subjectById.entries()) {
        subjectById.set(subjectId, { object: row.object, data: row.data });
      }
    }

    const tagRows = await fetchStudyTagRows(accountId);
    const tagBySubjectId: StudySubjectTagMap = new Map(
      tagRows.map((row) => [row.subjectId, { favorite: row.favorite, trouble: row.trouble }]),
    );
    let reviewRowsWithTrouble = reviewAssignments;
    if (mode !== QUEUE_TYPES.lesson && includeTrouble) {
      const reviewedSubjectIds = new Set([...reviewAssignments, ...reviewedAssignments].map((row) => row.data.subject_id));
      const troubleIds = tagRows.filter((row) => row.trouble).map((row) => row.subjectId);
      await hydrateMissingSubjects(token, subjectById, troubleIds);

      const injectCandidates = troubleIds
        .filter((subjectId) => !reviewedSubjectIds.has(subjectId))
        .sort((a, b) => a - b);

      const maxInject = troubleInjectionCount(reviewAssignments.length, injectCandidates.length);
      const injectedRows = injectCandidates.slice(0, maxInject).map((subjectId) => {
        const subjectType = normalizeSubjectType(subjectById.get(subjectId)?.object ?? "");
        return {
          assignmentId: -subjectId,
          queueType: QUEUE_TYPES.review,
          data: {
            subject_id: subjectId,
            subject_type: subjectType,
            srs_stage: 1,
            unlocked_at: new Date(0).toISOString(),
            started_at: null,
            passed_at: null,
            available_at: new Date().toISOString(),
          },
        };
      });

      reviewRowsWithTrouble = mergeTroubleRows(reviewAssignments, injectedRows);
    }

    const unfilteredQueued = mode === "all"
      ? [...reviewRowsWithTrouble, ...reviewedAssignments, ...lessonAssignments]
      : mode === QUEUE_TYPES.lesson
        ? lessonAssignments
        : [...reviewRowsWithTrouble, ...reviewedAssignments];
    const queued = tagFilter === "all"
      ? unfilteredQueued
      : unfilteredQueued.filter((row) => (tagBySubjectId.get(row.data.subject_id)?.[tagFilter] ?? false));

    const { sortedRows: sortedQueued, performanceBySubjectId } = await sortQueueRows({
      accountId,
      rows: queued,
      subjectById,
      difficultySort,
    });

    const totalRows = sortedQueued.length;
    const pagedRows = limit === null ? sortedQueued : sortedQueued.slice(offset, offset + limit);

    const counts = {
      reviews: reviewAssignments.length,
      lessons: lessonAssignments.length,
      all: reviewAssignments.length + lessonAssignments.length,
    };

    const tagCounts = {
      favorite: 0,
      trouble: 0,
    };

    const emptyTypeCounts = {
      all: 0,
      [SUBJECT_TYPES.radical]: 0,
      [SUBJECT_TYPES.kanji]: 0,
      [SUBJECT_TYPES.vocabulary]: 0,
    };
    const levelCounts: Record<number, number> = {};
    const typeCounts = { ...emptyTypeCounts };
    const typeCountsByLevel: Record<number, typeof emptyTypeCounts> = {};
    const srsCounts = {
      all: 0,
      locked: 0,
      apprentice: 0,
      guru: 0,
      master: 0,
      enlightened: 0,
      burned: 0,
    };
    const srsStageCounts: Record<number, number> = {};

    for (const row of sortedQueued) {
      const subjectType = normalizeSubjectType(row.data.subject_type);
      const level = subjectById.get(row.data.subject_id)?.data.level;
      const status = srsLabel(row.data.srs_stage, row.data.srs_stage <= 0 || !row.data.unlocked_at);

      typeCounts.all += 1;
      typeCounts[subjectType] += 1;
      srsCounts.all += 1;
      srsCounts[status] += 1;

      if (Number.isInteger(row.data.srs_stage) && row.data.srs_stage > 0) {
        srsStageCounts[row.data.srs_stage] = (srsStageCounts[row.data.srs_stage] ?? 0) + 1;
      }

      if (typeof level === "number") {
        levelCounts[level] = (levelCounts[level] ?? 0) + 1;
        const bucket = typeCountsByLevel[level] ?? { ...emptyTypeCounts };
        bucket.all += 1;
        bucket[subjectType] += 1;
        typeCountsByLevel[level] = bucket;
      }
    }

    const pageSubjectById = new Map<number, { object: string; data: SubjectData }>();
    for (const row of pagedRows) {
      const subject = subjectById.get(row.data.subject_id);
      if (subject) {
        pageSubjectById.set(row.data.subject_id, subject);
      }
    }

    const relatedSubjectIds = new Set<number>();
    for (const row of pagedRows) {
      const subject = pageSubjectById.get(row.data.subject_id)?.data;
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
      await hydrateMissingSubjects(token, pageSubjectById, Array.from(relatedSubjectIds));
    }

    const kanjiChars = Array.from(
      new Set(
        pagedRows
          .filter((row) => normalizeSubjectType(row.data.subject_type) === SUBJECT_TYPES.kanji)
          .map((row) => pageSubjectById.get(row.data.subject_id)?.data.characters)
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
      const related = pageSubjectById.get(subjectId);
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

    const rawItems = pagedRows.map((row) => {
      const subject = pageSubjectById.get(row.data.subject_id);
      const subjectData = subject?.data;
      const subjectType = normalizeSubjectType(row.data.subject_type);
      /*
       * The fifteen characterless radicals resolve to a glyph here rather than
       * falling through to the slug, which is what put the English word "tofu"
       * in front of a member reviewing 旅.
       */
      const label =
        resolveSubjectGlyph({ subjectType, characters: subjectData?.characters, slug: subjectData?.slug }) ??
        subjectData?.slug ??
        `#${row.data.subject_id}`;
      const primaryMeanings = (subjectData?.meanings ?? []).map((item) => item.meaning);
      const auxiliaryMeanings = (subjectData?.auxiliary_meanings ?? []).map((item) => item.meaning);
      const meanings = Array.from(new Set([...primaryMeanings, ...auxiliaryMeanings]));
      const readings = (subjectData?.readings ?? [])
        .filter((item) => item.accepted_answer ?? true)
        .map((item) => item.reading);
      const primaryReadings = (subjectData?.readings ?? [])
        .filter((item) => item.primary)
        .map((item) => item.reading);

      const componentSubjectIds = subjectData?.component_subject_ids ?? [];
      const amalgamationSubjectIds = subjectData?.amalgamation_subject_ids ?? [];
      const relatedSubjectType = (subjectId: number) => normalizeSubjectType(pageSubjectById.get(subjectId)?.object ?? "");

      const radicals =
        subjectType === SUBJECT_TYPES.kanji
          ? componentSubjectIds
              .filter((subjectId) => relatedSubjectType(subjectId) === SUBJECT_TYPES.radical)
              .map(relatedReferenceFromId)
          : [];

      const usedInVocabulary =
        subjectType === SUBJECT_TYPES.kanji
          ? amalgamationSubjectIds
              .filter((subjectId) => relatedSubjectType(subjectId) === SUBJECT_TYPES.vocabulary)
              .map(relatedReferenceFromId)
          : subjectType === SUBJECT_TYPES.radical
            ? amalgamationSubjectIds
                .filter((subjectId) => relatedSubjectType(subjectId) === SUBJECT_TYPES.kanji)
                .map(relatedReferenceFromId)
            : [];

      /*
       * Not WaniKani's list any more, and not a list at all: a warning, held
       * to the twins this member can act on. Theirs covered 67% of the kanji
       * they teach and nothing else; ours is the union of their pairs, a
       * stroke-edit distance and a curation pass, gated to what is already
       * learned or close enough ahead to be worth remembering.
       */
      const confusables =
        subjectType === SUBJECT_TYPES.kanji
          ? confusableWarnings(subjectData?.characters ?? "", account.wkLevel ?? null)
          : [];

      const componentKanji =
        subjectType === SUBJECT_TYPES.vocabulary
          ? componentSubjectIds
              .filter((subjectId) => relatedSubjectType(subjectId) === SUBJECT_TYPES.kanji)
              .map(relatedReferenceFromId)
          : [];

      const jlpt = subjectType === SUBJECT_TYPES.kanji ? jlptByKanji.get(subjectData?.characters ?? "") : null;
      // KANJIDIC lists forms a character never takes alone; the joyo table does not.
      const officialReadings = jlpt ? preferOfficialReadings(jlpt.kanji, jlpt.onReadings, jlpt.kunReadings) : null;
      const jlptMeta = jlpt
        ? {
            primaryMeaning: jlpt.primaryMeaning,
            meanings: jlpt.meanings,
            onReadings: officialReadings?.on ?? jlpt.onReadings,
            kunReadings: officialReadings?.kun ?? jlpt.kunReadings,
            nanoriReadings: jlpt.nanoriReadings,
            wordExamples: jlpt.wordExamples,
            strokeCount: jlpt.strokeCount,
            frequencyRank: jlpt.frequencyRank,
            schoolGrade: jlpt.schoolGrade,
            heisigKeyword: jlpt.heisigKeyword,
          }
        : null;

      const tags = tagBySubjectId.get(row.data.subject_id) ?? { favorite: false, trouble: false, burned: false };
      if (tags.favorite) {
        tagCounts.favorite += 1;
      }
      if (tags.trouble) {
        tagCounts.trouble += 1;
      }

      return {
        subjectId: row.data.subject_id,
        assignmentId: row.assignmentId,
        queueType: row.queueType,
        isInjectedTrouble: row.assignmentId < 0,
        studyTags: tags,
        subjectType,
        wkLevel: subjectData?.level ?? null,
        characters: label,
        meanings,
        readings,
        primaryReadings,
        radicals,
        confusables,
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
    });
    const items = difficultySort
      ? applyReviewSuccessRates(rawItems, performanceBySubjectId)
      : await withReviewSuccessRates(accountId, rawItems);

    if (canWriteServerCache) {
      setCachedStudyQueue(
        accountId,
        mode,
        cacheVariant,
        items,
        counts,
        tagCounts,
        levelCounts,
        typeCounts,
        typeCountsByLevel,
        srsCounts,
        srsStageCounts,
      );
    }

    return NextResponse.json(
      {
        items,
        counts,
        tagCounts,
        levelCounts,
        typeCounts,
        typeCountsByLevel,
        srsCounts,
        srsStageCounts,
        pagination: {
          offset,
          limit: limit ?? totalRows,
          total: totalRows,
          hasMore: limit === null ? false : offset + limit < totalRows,
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
    },
  });
}
