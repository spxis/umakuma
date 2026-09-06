/**
 * What the XP history page says, in one map for the locale layer.
 *
 * The wording around a row is doing real work and is worth not trimming. Each
 * row is a whole Vancouver day's earning of one kind, so every label here says
 * "day" or "on this day" rather than naming a time: a member who reads a row as
 * a single moment will wonder why fifty reviews earned one line.
 */
export const XP_HISTORY_COPY = {
  title: "XP",
  subtitle: (name: string) => `Every day ${name} has earned XP, and what for.`,
  board: "XP board",

  summary: "Your habit so far",
  streak: "Current streak",
  longestStreak: "Longest streak",
  days: (count: number) => `${count.toLocaleString()} ${count === 1 ? "day" : "days"}`,
  daysActive: "Days with XP",
  averagePerDay: "Average on a day you turn up",
  bestDay: "Best day",
  lastActive: "Last earned",
  lastActiveToday: "Today",
  lastActiveDays: (count: number) => `${count} ${count === 1 ? "day" : "days"} ago`,
  lastActiveNever: "Not yet",
  xpAmount: (amount: number) => `${amount.toLocaleString()} XP`,
  xpGain: (amount: number) => `+${amount.toLocaleString()} XP`,

  split: "What your XP came from",
  splitShare: (share: number) => `${Math.round(share * 100)}%`,

  ledger: "Day by day",
  ledgerHint:
    "One line per kind per day. A day's reviews are a single line, so the amount is the whole day's earning rather than a single award.",
  runningTotal: (total: number) => `${total.toLocaleString()} XP total`,

  empty: "No XP yet.",
  emptyHint:
    "XP starts on your first day here. Answer a review, finish a game or simply sign in, and this fills up.",
} as const;

/**
 * The browsable record, which is a different page from the summary.
 *
 * `/xp` answers "how am I doing" and shows the recent days inline. This
 * answers "what happened on the fourteenth of March", and it is the same
 * shape as Study history on purpose - a member should not have to learn two
 * ways of reading their own record.
 */
export const XP_LEDGER_HISTORY_COPY = {
  title: "XP history",
  subtitle: (name: string) => `Everything ${name} has earned, day by day`,
  back: "XP summary",
  /* One row is a day of one kind of earning, because that is the grain the
     data actually holds - fifty reviews on a Tuesday are one row. */
  grain: "One row is a day of one kind of earning. Fifty reviews answered on a Tuesday are one row.",
  columns: {
    day: "Day",
    kind: "What for",
    amount: "XP",
    when: "When",
  },
  sortHint: "Sort by this column",
  allKinds: "Everything",
  kindCount: (count: number, total: number) =>
    `${count.toLocaleString()} ${count === 1 ? "day" : "days"} · ${total.toLocaleString()} XP`,
  summary: (shown: number, total: number, xp: number) =>
    `${shown.toLocaleString()} of ${total.toLocaleString()} rows · ${xp.toLocaleString()} XP`,
  perPage: (size: number) => `${size} per page`,
  /* Both ends of the day, because the row accumulates: these bracket the
     earning rather than timing a single award. */
  span: (first: string, last: string) => (first === last ? first : `${first} – ${last}`),
  empty: "Nothing earned yet.",
  emptyFiltered: "Nothing of that kind yet.",
  emptyHint: "Answer a review, finish a game, or read something and it will show up here.",
  loading: "Loading your history…",
  failed: "Could not load your XP history. Try again?",
} as const;
