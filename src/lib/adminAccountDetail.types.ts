/**
 * What the admin's screen for one member is made of.
 *
 * Kept out of the loader so the client components can import the shape without
 * dragging `server-only` and Prisma into the bundle. Every timestamp is an ISO
 * string, because this crosses a JSON boundary before anybody reads it.
 */

export type AdminAccountDetail = {
  id: string;
  nickname: string;
  slug: string | null;
  displayName: string | null;
  joinedByName: string | null;
  joinedByEmail: string | null;
  visibility: string | null;
  internal: boolean;
  approvalStatus: string | null;
  approvedAt: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  disabledBy: string | null;
  /** Whether a code is set, never the code itself: it is stored as a hash. */
  hasInviteCode: boolean;
  inviteCodeUpdatedAt: string | null;
  wkUsername: string | null;
  wkLevel: number | null;
  unLevel: number;
  unLevelFloor: number;
  ugLevel: number;
  ugLevelFloor: number;
  /** Which of the two ladders this member follows. */
  ladderStream: string;
  unPlacedAt: string | null;
  unPlacementSource: string | null;
  srsTheme: string | null;
  ageBand: string | null;
  jlptStatus: string | null;
  xp: number;
  xpLevel: number;
  xpRankName: string;
  /** XP earned since reaching the current rank, and what the rank spans. */
  xpIntoLevel: number;
  xpLevelSpan: number;
  score: number;
  pendingReviews: number;
  lastSyncedAt: string;
  lastSyncStatus: string;
  lastSyncError: string | null;
  lastActivityAt: string | null;
  createdAt: string;
};

/**
 * One awardable kind, as the admin sees it.
 *
 * `dailyCap` and `earnedToday` travel with it because an admin award lands on
 * the same daily row a member's own earning does, so choosing a capped kind has
 * a consequence for the rest of that member's day. The form says so rather than
 * leaving it to be found out.
 */
export type AdminXpTypeOption = {
  id: string;
  label: string;
  note: string;
  amount: number;
  dailyCap: number | null;
  retired: boolean;
  earnedToday: number;
};

export type AdminXpEventRow = {
  id: string;
  kind: string;
  amount: number;
  dayKey: string;
  note: string | null;
  updatedAt: string;
};

/**
 * How a member is actually getting on, as opposed to what their row says.
 *
 * `daysSinceLastActive` is the number this screen exists for on a family site:
 * a member who has not appeared in a fortnight is worth knowing about before
 * they are gone for good, and nothing else on the page says it.
 */
export type AdminActivitySummary = {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  lastActiveDay: string | null;
  daysSinceLastActive: number | null;
  daysActive: number;
  totalXp: number;
  averagePerActiveDay: number;
  bestDay: { dayKey: string; amount: number } | null;
};

/** The allowance, what is spent, and what an admin added on top. */
export type AdminRestStanding = {
  restDaysEarned: number;
  restDaysGranted: number;
  restDaysAllowed: number;
  restDaysUsed: number;
  restDaysLeft: number;
  vacationWeeksAllowed: number;
  vacationDaysEarned: number;
  vacationDaysGranted: number;
  vacationDaysAllowed: number;
  vacationDaysUsed: number;
  vacationDaysLeft: number;
  onVacation: boolean;
  /** When they went away and when they are due back. ISO, or null. */
  vacationStartedAt: string | null;
  vacationEndsAt: string | null;
};

export type AdminTimeOffGrantRow = {
  id: string;
  kind: string;
  days: number;
  note: string | null;
  grantedBy: string | null;
  createdAt: string;
  /** False once the rolling year has moved past it and it stopped counting. */
  counting: boolean;
};

export type AdminAccountDetailPayload = {
  account: AdminAccountDetail;
  xpTypes: AdminXpTypeOption[];
  recentXpEvents: AdminXpEventRow[];
  activity: AdminActivitySummary;
  rest: AdminRestStanding;
  restGrants: AdminTimeOffGrantRow[];
};

/**
 * What an award actually did, as the XP route hands it back.
 *
 * The same shape `awardXp` returns, restated here rather than imported from
 * `xpServer` so a client component can read it without pulling `server-only`
 * into the bundle.
 */
export type XpAwardOutcome = {
  awarded: number;
  xp: number;
  level: number;
  rankedUp: boolean;
};
