import { prisma } from "@/lib/prisma";
import { getCustomStudyHistoryRows } from "@/lib/customStudy/customStudyHistoryRows";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";
import {
  SRS_BUCKETS,
  isWkStatus,
  srsBucketFromStage,
  type SrsBucket,
  type WkStatus,
  type SubjectType,
} from "@/lib/domainConstants";
import type { JlptMeta } from "@/lib/jlptTypes";
export type StudyHistorySortBy = "submittedAt" | "result" | "subjectType" | "subject" | "user";
export type StudyHistorySortDir = "asc" | "desc";
export type StudyHistorySource = "wanikani" | "custom";
export type StudyHistoryRow = {
  id: string;
  accountId: string;
  nickname: string;
  wkUsername: string;
  assignmentId: number;
  subjectId: number;
  subjectType: string;
  result: string;
  submittedAt: string;
  subjectLabel: string;
  subjectReading: string | null;
  subjectMeaning: string | null;
  wkLevel: number | null;
  srsStage: number | null;
  srsBucket: SrsBucket;
  subjectData: SnapshotItem | null;
};
export type StudyHistoryPage = {
  attempts: StudyHistoryRow[];
  totals: Record<string, number>;
  resultCounts: Record<"all" | "correct" | "wrong" | "skipped", number>;
  levelAllCount: number;
  levelCounts: Record<number, number>;
  srsBucketAllCount: number;
  srsBucketCounts: Record<SrsBucket, number>;
  accountCount: number;
  availableLevels: number[];
  availableSrs: number[];
  availableSrsBuckets: Array<
    SrsBucket
  >;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};
type QueryArgs = {
  accountId?: string;
  source: StudyHistorySource;
  libraryId?: string;
  result?: "correct" | "wrong" | "skipped";
  level?: number;
  srs?: number;
  srsBucket?: WkStatus;
  page: number;
  pageSize: number;
  sortBy: StudyHistorySortBy;
  sortDir: StudyHistorySortDir;
};
type SnapshotItem = {
  subjectId?: number;
  subjectType?: SubjectType;
  status?: WkStatus;
  characters?: string;
  meanings?: string[];
  readings?: string[];
  primaryReadings?: string[];
  radicals?: Array<{ subjectId: number; label: string; wkLevel?: number | null; reading?: string | null; meaning?: string | null }>;
  visuallySimilar?: Array<{ subjectId: number; label: string; wkLevel?: number | null; reading?: string | null; meaning?: string | null }>;
  usedInVocabulary?: Array<{ subjectId: number; label: string; wkLevel?: number | null; reading?: string | null; meaning?: string | null }>;
  componentKanji?: Array<{ subjectId: number; label: string; wkLevel?: number | null; reading?: string | null; meaning?: string | null }>;
  meaningExplanation?: string;
  readingExplanation?: string;
  jlptLevel?: number | null;
  jlptMeta?: JlptMeta | null;
  startedAt?: string | null;
  passedAt?: string | null;
  availableAt?: string | null;
  wkLevel?: number;
  srsStage?: number;
};
function parseSnapshotItems(raw: unknown): SnapshotItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((row): row is SnapshotItem => {
    if (!row || typeof row !== "object") {
      return false;
    }
    const typed = row as SnapshotItem;
    return typeof typed.subjectId === "number" && typed.subjectId > 0;
  });
}
function normalizeSort(sortBy: string | null): StudyHistorySortBy {
  if (sortBy === "result" || sortBy === "subjectType" || sortBy === "subject" || sortBy === "user") {
    return sortBy;
  }
  return "submittedAt";
}
function normalizeDir(sortDir: string | null): StudyHistorySortDir {
  return sortDir === "asc" ? "asc" : "desc";
}
function normalizePage(raw: string | null): number {
  const parsed = Number(raw ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.trunc(parsed);
}
function normalizePageSize(raw: string | null): number {
  const parsed = Number(raw ?? "25");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 25;
  }
  return Math.min(100, Math.trunc(parsed));
}
function normalizeResult(raw: string | null): QueryArgs["result"] {
  if (raw === "correct" || raw === "wrong" || raw === "skipped") {
    return raw;
  }
  return undefined;
}
function normalizeSource(raw: string | null): StudyHistorySource {
  return raw === "custom" ? "custom" : "wanikani";
}
function normalizeSrsBucket(raw: string | null): QueryArgs["srsBucket"] {
  if (isWkStatus(raw)) {
    return raw;
  }
  return undefined;
}
function getSrsBucketFromStage(stage: number | null): SrsBucket {
  return srsBucketFromStage(stage);
}
function normalizeOptionalPositiveInt(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}
function normalizeOptionalString(raw: string | null): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}
export function parseStudyHistoryQuery(url: URL): QueryArgs {
  return {
    accountId: url.searchParams.get("accountId") ?? undefined,
    source: normalizeSource(url.searchParams.get("source")),
    libraryId: normalizeOptionalString(url.searchParams.get("libraryId")),
    result: normalizeResult(url.searchParams.get("result")),
    level: normalizeOptionalPositiveInt(url.searchParams.get("level")),
    srs: normalizeOptionalPositiveInt(url.searchParams.get("srs")),
    srsBucket: normalizeSrsBucket(url.searchParams.get("srsBucket")),
    page: normalizePage(url.searchParams.get("page")),
    pageSize: normalizePageSize(url.searchParams.get("pageSize")),
    sortBy: normalizeSort(url.searchParams.get("sortBy")),
    sortDir: normalizeDir(url.searchParams.get("sortDir")),
  };
}
export async function getStudyHistoryPage(args: QueryArgs): Promise<StudyHistoryPage> {
  let allRows: StudyHistoryRow[] = [];
  if (args.source === "custom" && args.accountId) {
    allRows = await getCustomStudyHistoryRows({
      accountId: args.accountId,
      libraryId: args.libraryId,
      result: args.result,
    });
  } else {
    const where = {
      ...(args.accountId ? { accountId: args.accountId } : {}),
      ...(args.result ? { result: args.result } : {}),
    };
    const attempts = await prisma.studyReviewAttempt.findMany({
      where,
      orderBy: { submittedAt: "desc" },
    });
    const accountIds = Array.from(new Set(attempts.map((row) => row.accountId)));
    const [accountRows, subjectSnapshotRows] = await Promise.all([
      prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: {
          id: true,
          nickname: true,
          wkUsername: true,
          levelKanjiItems: true,
        },
      }),
      prisma.levelSnapshot.findMany({
        where: { accountId: { in: accountIds } },
        orderBy: { syncedAt: "desc" },
        select: { accountId: true, items: true },
      }),
    ]);
    const accountMap = new Map(
      accountRows.map((row) => [row.id, { nickname: row.nickname, wkUsername: row.wkUsername }]),
    );
    const subjectMeta = new Map<
      string,
      {
        label: string;
        reading: string | null;
        meaning: string | null;
        wkLevel: number | null;
        srsStage: number | null;
        srsBucket: SrsBucket;
        subjectData: SnapshotItem | null;
      }
    >();
    for (const row of subjectSnapshotRows) {
      for (const item of parseSnapshotItems(row.items)) {
        const key = `${row.accountId}:${item.subjectId}`;
        if (subjectMeta.has(key)) {
          continue;
        }
        const reading = Array.isArray(item.primaryReadings)
          ? item.primaryReadings[0] ?? null
          : Array.isArray(item.readings)
            ? item.readings[0] ?? null
            : null;
        const meaning = Array.isArray(item.meanings) ? item.meanings[0] ?? null : null;
        const stage = typeof item.srsStage === "number" ? item.srsStage : null;
        subjectMeta.set(key, {
          label: item.characters ?? `#${item.subjectId}`,
          reading,
          meaning,
          wkLevel: typeof item.wkLevel === "number" ? item.wkLevel : null,
          srsStage: stage,
          srsBucket: item.status ?? getSrsBucketFromStage(stage),
          subjectData: item,
        });
      }
    }
    for (const row of accountRows) {
      for (const item of parseSnapshotItems(row.levelKanjiItems)) {
        const key = `${row.id}:${item.subjectId}`;
        if (subjectMeta.has(key)) {
          continue;
        }
        const reading = Array.isArray(item.primaryReadings)
          ? item.primaryReadings[0] ?? null
          : Array.isArray(item.readings)
            ? item.readings[0] ?? null
            : null;
        const meaning = Array.isArray(item.meanings) ? item.meanings[0] ?? null : null;
        const stage = typeof item.srsStage === "number" ? item.srsStage : null;
        subjectMeta.set(key, {
          label: item.characters ?? `#${item.subjectId}`,
          reading,
          meaning,
          wkLevel: typeof item.wkLevel === "number" ? item.wkLevel : null,
          srsStage: stage,
          srsBucket: item.status ?? getSrsBucketFromStage(stage),
          subjectData: item,
        });
      }
    }
    const canonicalDetailsBySubjectId = await getCatalogSubjectDetails(
      Array.from(new Set(attempts.map((row) => row.subjectId))),
    );
    allRows = attempts.map((row) => {
      const account = accountMap.get(row.accountId);
      const fallbackUser = row.accountId;
      const key = `${row.accountId}:${row.subjectId}`;
      const subject = subjectMeta.get(key);
      const canonical = canonicalDetailsBySubjectId.get(row.subjectId);
      const canonicalSubjectData: SnapshotItem | null = canonical
        ? {
            subjectId: canonical.subjectId,
            subjectType: canonical.subjectType,
            status: subject?.subjectData?.status,
            characters: canonical.characters,
            meanings: canonical.meanings,
            readings: canonical.readings,
            primaryReadings: canonical.primaryReadings,
            radicals: canonical.radicals,
            visuallySimilar: canonical.visuallySimilar,
            usedInVocabulary: canonical.usedInVocabulary,
            componentKanji: canonical.componentKanji,
            meaningExplanation: canonical.meaningExplanation,
            readingExplanation: canonical.readingExplanation,
            jlptLevel: canonical.jlptLevel,
            jlptMeta: canonical.jlptMeta,
            startedAt: subject?.subjectData?.startedAt ?? null,
            passedAt: subject?.subjectData?.passedAt ?? null,
            availableAt: subject?.subjectData?.availableAt ?? null,
            wkLevel: canonical.wkLevel,
            srsStage: subject?.srsStage ?? undefined,
          }
        : subject?.subjectData ?? null;
      return {
        id: row.id,
        accountId: row.accountId,
        nickname: account?.nickname ?? fallbackUser,
        wkUsername: account?.wkUsername ?? fallbackUser,
        assignmentId: row.assignmentId,
        subjectId: row.subjectId,
        subjectType: row.subjectType,
        result: row.result,
        submittedAt: row.submittedAt.toISOString(),
        subjectLabel: canonical?.characters ?? subject?.label ?? `#${row.subjectId}`,
        subjectReading: canonical?.primaryReadings[0] ?? canonical?.readings[0] ?? subject?.reading ?? null,
        subjectMeaning: canonical?.meanings[0] ?? subject?.meaning ?? null,
        wkLevel: canonical?.wkLevel ?? subject?.wkLevel ?? null,
        srsStage: subject?.srsStage ?? null,
        srsBucket: subject?.srsBucket ?? "unknown",
        subjectData: canonicalSubjectData,
      };
    });
  }
  function applyFilters(
    source: StudyHistoryRow[],
    filters: Pick<QueryArgs, "result" | "level" | "srs" | "srsBucket">,
  ): StudyHistoryRow[] {
    let next = source;
    if (filters.result) {
      next = next.filter((row) => row.result === filters.result);
    }
    if (typeof filters.level === "number") {
      next = next.filter((row) => row.wkLevel === filters.level);
    }
    if (typeof filters.srs === "number") {
      next = next.filter((row) => row.srsStage === filters.srs);
    }
    if (filters.srsBucket) {
      next = next.filter((row) => row.srsBucket === filters.srsBucket);
    }
    return next;
  }
  const rowsForResultCounts = applyFilters(allRows, {
    level: args.level,
    srs: args.srs,
    srsBucket: args.srsBucket,
  });
  const rowsForLevelCounts = applyFilters(allRows, {
    result: args.result,
    srs: args.srs,
    srsBucket: args.srsBucket,
  });
  const rowsForSrsBucketCounts = applyFilters(allRows, {
    result: args.result,
    level: args.level,
    srs: args.srs,
  });
  let rows = applyFilters(allRows, {
    result: args.result,
    level: args.level,
    srs: args.srs,
    srsBucket: args.srsBucket,
  });
  const compareSign = args.sortDir === "asc" ? 1 : -1;
  rows = rows.sort((a, b) => {
    if (args.sortBy === "submittedAt") {
      return compareSign * (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    }
    if (args.sortBy === "result") {
      const compare = a.result.localeCompare(b.result, undefined, { sensitivity: "base" });
      return compare === 0
        ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        : compare * compareSign;
    }
    if (args.sortBy === "subjectType") {
      const compare = a.subjectType.localeCompare(b.subjectType, undefined, { sensitivity: "base" });
      return compare === 0
        ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        : compare * compareSign;
    }
    if (args.sortBy === "subject") {
      const compare = a.subjectLabel.localeCompare(b.subjectLabel, undefined, { sensitivity: "base" });
      return compare * compareSign;
    }
    const compare = a.nickname.localeCompare(b.nickname, undefined, { sensitivity: "base" });
    return compare * compareSign;
  });
  const totalsByResult: Record<string, number> = {};
  for (const row of rows) {
    totalsByResult[row.result] = (totalsByResult[row.result] ?? 0) + 1;
  }
  const resultCounts: Record<"all" | "correct" | "wrong" | "skipped", number> = {
    all: rowsForResultCounts.length,
    correct: 0,
    wrong: 0,
    skipped: 0,
  };
  for (const row of rowsForResultCounts) {
    if (row.result === "correct" || row.result === "wrong" || row.result === "skipped") {
      resultCounts[row.result] += 1;
    }
  }
  const levelCounts: Record<number, number> = {};
  for (const row of rowsForLevelCounts) {
    if (typeof row.wkLevel !== "number") {
      continue;
    }
    levelCounts[row.wkLevel] = (levelCounts[row.wkLevel] ?? 0) + 1;
  }
  const srsBucketCounts: Record<SrsBucket, number> = {
    [SRS_BUCKETS.apprentice]: 0,
    [SRS_BUCKETS.guru]: 0,
    [SRS_BUCKETS.master]: 0,
    [SRS_BUCKETS.enlightened]: 0,
    [SRS_BUCKETS.burned]: 0,
    [SRS_BUCKETS.locked]: 0,
    [SRS_BUCKETS.unknown]: 0,
  };
  for (const row of rowsForSrsBucketCounts) {
    srsBucketCounts[row.srsBucket] += 1;
  }
  const filteredTotal = rows.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / args.pageSize));
  const page = Math.min(args.page, totalPages);
  const pageStart = (page - 1) * args.pageSize;
  const pagedRows = rows.slice(pageStart, pageStart + args.pageSize);
  const availableLevels = Array.from(
    new Set(rowsForLevelCounts.map((row) => row.wkLevel).filter((level): level is number => typeof level === "number")),
  ).sort((a, b) => a - b);
  const availableSrs = Array.from(
    new Set(rows.map((row) => row.srsStage).filter((srs): srs is number => typeof srs === "number")),
  ).sort((a, b) => a - b);
  const availableSrsBuckets = Array.from(new Set(rowsForSrsBucketCounts.map((row) => row.srsBucket)));
  const accountCount = new Set(rows.map((row) => row.accountId)).size;
  return {
    attempts: pagedRows,
    totals: totalsByResult,
    resultCounts,
    levelAllCount: rowsForLevelCounts.length,
    levelCounts,
    srsBucketAllCount: rowsForSrsBucketCounts.length,
    srsBucketCounts,
    accountCount,
    availableLevels,
    availableSrs,
    availableSrsBuckets,
    pagination: {
      page,
      pageSize: args.pageSize,
      total: filteredTotal,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
