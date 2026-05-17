import type { SubjectType, WkStatus } from "@/lib/domainConstants";

export type WaniKaniUserResponse = {
  data: {
    id: string;
    username: string;
    level: number;
  };
};

export type WaniKaniCollectionResponse = {
  object: "collection";
  data_updated_at?: string | null;
  pages: {
    next_url: string | null;
  };
  total_count: number;
  data: Array<{
    id: number;
    object?: string;
    data_updated_at?: string;
    data: Record<string, unknown>;
  }>;
};

export type WaniKaniSummaryResponse = {
  data: {
    reviews: Array<{
      available_at: string;
      subject_ids: number[];
    }>;
  };
};

export type WaniKaniResponseHeaders = {
  etag: string | null;
  lastModified: string | null;
};

export type HttpCacheEntry = {
  etag: string | null;
  lastModified: string | null;
};

export type HttpCacheState = {
  user?: HttpCacheEntry;
  reviewStats?: HttpCacheEntry;
  burnedAssignments?: HttpCacheEntry;
};

export type AssignmentCacheRow = {
  id: number;
  object?: string;
  data_updated_at?: string;
  data: Record<string, unknown>;
};

export type GuruedItemSummary = {
  subjectId: number;
  label: string;
  reading: string | null;
  passedAt: string;
};

export type ExistingLeaderboardState = {
  wkUserId: string;
  wkUsername: string;
  wkLevel: number;
  reviewCount: number;
  burnedCount: number;
  reviewsUpdatedAt: Date | null;
  lastRadicalGuruedAt: Date | null;
  lastKanjiGuruedAt: Date | null;
  lastVocabularyGuruedAt: Date | null;
  lastRadicalGuruedItem: unknown;
  lastKanjiGuruedItem: unknown;
  lastVocabularyGuruedItem: unknown;
  assignmentCache: unknown;
  assignmentCacheUpdatedAt: Date | null;
  wkHttpCache: unknown;
};

export type LeaderboardSyncCache = {
  assignmentCache: AssignmentCacheRow[];
  assignmentCacheUpdatedAt: Date;
  reviewsUpdatedAt: Date | null;
  wkHttpCache: HttpCacheState;
};

export type LeaderboardStats = {
  wkUserId: string;
  wkUsername: string;
  wkLevel: number;
  reviewCount: number;
  burnedCount: number;
  pendingReviews: number;
  radicalCount: number;
  vocabularyCount: number;
  apprenticeCount: number;
  guruCount: number;
  masterCount: number;
  enlightenedCount: number;
  levelKanjiTotal: number;
  levelKanjiLearned: number;
  levelKanjiGuruPlus: number;
  levelKanjiLocked: number;
  estimatedHoursRemaining: number | null;
  lastActivityAt: Date | null;
  levelKanjiItems: Array<{
    subjectId: number;
    characters: string;
    meanings: string[];
    srsStage: number;
    status: WkStatus;
    availableAt: string | null;
  }>;
  itemSpread: {
    apprentice: { radical: number; kanji: number; vocabulary: number; total: number };
    guru: { radical: number; kanji: number; vocabulary: number; total: number };
    master: { radical: number; kanji: number; vocabulary: number; total: number };
    enlightened: { radical: number; kanji: number; vocabulary: number; total: number };
    burned: { radical: number; kanji: number; vocabulary: number; total: number };
    totals: { radical: number; kanji: number; vocabulary: number; total: number };
  };
  jlptCounts: {
    n1: { learned: number; total: number; percent: number };
    n2: { learned: number; total: number; percent: number };
    n3: { learned: number; total: number; percent: number };
    n4: { learned: number; total: number; percent: number };
    n5: { learned: number; total: number; percent: number };
  };
  lastRadicalGuruedAt: Date | null;
  lastKanjiGuruedAt: Date | null;
  lastVocabularyGuruedAt: Date | null;
  lastRadicalGuruedItem: GuruedItemSummary | null;
  lastKanjiGuruedItem: GuruedItemSummary | null;
  lastVocabularyGuruedItem: GuruedItemSummary | null;
  score: number;
  cache: LeaderboardSyncCache;
};

export type UserKanjiIndexItem = {
  subjectId: number;
  characters: string;
  meanings: string[];
  readings: string[];
  primaryReadings: string[];
  meaningExplanation: string;
  readingExplanation: string;
  startedAt: string | null;
  passedAt: string | null;
  availableAt: string | null;
  srsStage: number;
  status: WkStatus;
  wkLevel: number | null;
};

export type LevelKanjiSnapshot = {
  level: number;
  kanjiTotal: number;
  kanjiLearned: number;
  kanjiGuruPlus: number;
  kanjiLocked: number;
  estimatedHoursRemaining: number | null;
  items: Array<{
    subjectId: number;
    subjectType: SubjectType;
    wkLevel: number;
    characters: string;
    meanings: string[];
    readings: string[];
    primaryReadings: string[];
    radicals: Array<{
      subjectId: number;
      label: string;
      wkLevel: number | null;
      reading: string | null;
    }>;
    visuallySimilar: Array<{
      subjectId: number;
      label: string;
      wkLevel: number | null;
      reading: string | null;
    }>;
    usedInVocabulary: Array<{
      subjectId: number;
      label: string;
      wkLevel: number | null;
      reading: string | null;
    }>;
    componentKanji: Array<{
      subjectId: number;
      label: string;
      wkLevel: number | null;
      reading: string | null;
    }>;
    meaningExplanation: string;
    readingExplanation: string;
    jlptLevel: number | null;
    srsStage: number;
    status: WkStatus;
    startedAt: string | null;
    passedAt: string | null;
    availableAt: string | null;
  }>;
};

export type WaniKaniAssignmentData = {
  subject_id: number;
  subject_type: string;
  srs_stage: number;
  unlocked_at: string | null;
  started_at: string | null;
  passed_at: string | null;
  burned_at: string | null;
  resurrected_at: string | null;
  available_at: string | null;
};

export type WaniKaniReviewData = {
  subject_id: number;
  starting_srs_stage: number;
  ending_srs_stage: number;
  created_at: string | null;
};
