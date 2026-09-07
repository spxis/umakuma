import type { ReactNode } from "react";
import type { LearnedSrsGroup } from "@/lib/domainConstants";
import type { ItemSpread } from "@/lib/itemSpread";
import type { LadderStreamValue } from "@/lib/ladder/ladderStreams";

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

export type TabId = "learn" | "wk" | "jlpt" | "stats" | "news" | "read";

export type ViewerMenuInfo = {
  provider: "google" | "invite";
  name: string;
  email: string | null;
  wkUsername: string | null;
  /**
   * The viewer's permanent address, which an account has even with no
   * WaniKani connection. Page access matches on this first; `wkUsername` is
   * kept because links shared before slugs existed still carry it.
   */
  slug: string | null;
  /** The viewer's own account, for surfaces that write as them; null for a session with no account. */
  accountId: string | null;
  /**
   * Whether a WaniKani token is stored against this viewer's account.
   *
   * Separate from `wkUsername` on purpose: the username is an address links
   * still carry, and what decides whether a WaniKani-shaped surface is offered
   * is whether there is a token behind it.
   */
  hasWanikani: boolean;
  /** One of us: the family and anybody let in deliberately. Decides who is offered the reading challenge. */
  internal: boolean;
  /**
   * The three numbers the header carries, and null for anyone who is not a
   * member — signed out, or an account that was turned away. Null rather than
   * zero on purpose: a stranger has no XP, which is a different statement from
   * having earned none, and the header draws nothing at all for the first.
   */
  xp: number | null;
  /**
   * The viewer's own ladder, and their standing on it.
   *
   * A stream and a level rather than a bare `unLevel`, because the header is a
   * level reader like any other and the column it must read depends on the
   * path the member is being taught on: it printed `UN` at everybody, so a UG
   * member read their UN standing under the wrong prefix. `ladderColumns` says
   * which column; this pair is its answer, carried rather than re-derived,
   * since the badge and the board it links to have to agree.
   *
   * Null for a non-member, like the numbers beside it.
   */
  ladderStream: LadderStreamValue | null;
  ladderLevel: number | null;
  /** WaniKani's, out of sixty. Null for a non-member and for a member who has never connected one. */
  wkLevel: number | null;
  /**
   * What this viewer's SRS stages are called, resolved against their age band
   * rather than read raw off the row: a member whose band has since dropped is
   * on the default again, and the header must say the words they will actually
   * meet in a review. Null for anyone who is not a member, like the numbers.
   */
  themeId: string | null;
  themeName: string | null;
  isAdmin: boolean;
};

export type UserDashboardTabsProps = {
  accountId: string;
  nickname: string;
  wkUsername: string;
  linkedEmail: string | null;
  viewerMatchesAccount: boolean;
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
  initialDashboardTab: TabId;
  /**
   * Whether the address named that tab, or merely resolved to it.
   *
   * `/study` and the bare user page both resolve to "learn"; only the first is
   * a request to open the study tab. Without the distinction, tapping Study
   * from an explorer changed the URL and left the explorer on screen.
   */
  dashboardTabAddressed?: boolean;
  learnContent: ReactNode;
  newsContent: ReactNode;
  readContent: ReactNode;
};
