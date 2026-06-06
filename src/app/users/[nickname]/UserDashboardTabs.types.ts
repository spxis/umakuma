import type { ReactNode } from "react";
import type { LearnedSrsGroup } from "@/lib/domainConstants";
import type { ItemSpread } from "@/lib/itemSpread";

export type ItemSpreadRow = {
  radical: number;
  kanji: number;
  vocabulary: number;
  total: number;
};

export type TypeProgress = {
  guruOrHigher: number;
  total: number;
  percent: number;
  locked: number;
  apprentice: number;
  guru: number;
  master: number;
  enlightened: number;
  burned: number;
};

export type LevelProgressSnapshot = {
  radical: TypeProgress;
  kanji: TypeProgress;
  vocabulary: TypeProgress;
  remainingToLevelUp: number;
  passedLevelUpGate: boolean;
};

export type SrsGroupKey = LearnedSrsGroup;

export type ItemSpreadLevelBreakdown = {
  level: number;
  radical: number;
  kanji: number;
  vocabulary: number;
  total: number;
};

export type ItemSpreadStageBreakdown = {
  label: string;
  radical: number;
  kanji: number;
  vocabulary: number;
  total: number;
};

export type ItemSpreadGroupDetails = Record<
  SrsGroupKey,
  {
    levels: ItemSpreadLevelBreakdown[];
    stages: ItemSpreadStageBreakdown[];
  }
>;

export type TabId = "learn" | "stats" | "news" | "read";

export type ViewerMenuInfo = {
  provider: "google" | "invite";
  name: string;
  email: string | null;
  wkUsername: string | null;
  isAdmin: boolean;
};

export type UserDashboardTabsProps = {
  accountId: string;
  nickname: string;
  wkUsername: string;
  linkedEmail: string | null;
  viewerMatchesAccount: boolean;
  lastSyncedAt: string;
  lastActivityAt: string | null;
  wkLevel: number;
  levelKanjiLearned: number;
  levelKanjiTotal: number;
  levelKanjiLocked: number;
  totalLearnedKanji: number;
  estimatedHoursRemaining: number | null;
  apprenticeCount: number;
  guruCount: number;
  masterCount: number;
  enlightenedCount: number;
  burnedCount: number;
  radicalCount: number;
  totalKanjiCount: number;
  vocabularyCount: number;
  itemSpread: ItemSpread;
  itemSpreadDetails: ItemSpreadGroupDetails;
  levelRadicalProgress: TypeProgress;
  levelKanjiProgress: TypeProgress;
  levelVocabularyProgress: TypeProgress;
  remainingToLevelUp: number;
  passedLevelUpGate: boolean;
  availableProgressLevels: number[];
  levelProgressByLevel: Record<number, LevelProgressSnapshot>;
  viewerMenuInfo: ViewerMenuInfo | null;
  canViewAllUserPages: boolean;
  initialDashboardTab: TabId;
  learnContent: ReactNode;
  newsContent: ReactNode;
  readContent: ReactNode;
};

export type LiveData = {
  lastSyncedAt: string;
  lastActivityAt: string | null;
};
