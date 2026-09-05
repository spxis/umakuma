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
