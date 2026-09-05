/**
 * What the XP board says, in one map for the locale layer.
 *
 * The subtitle carries the point of the page and is worth not softening. The
 * other board ranks WaniKani numbers, so it can only ever list members who have
 * connected an account there; this one ranks XP, which everybody starts earning
 * on their first day. It is the first board the whole family can be on.
 */
export const XP_BOARD_COPY = {
  title: "XP board",
  subtitle: "Everyone who studies here, ranked by XP.",
  blurb:
    "XP starts on day one, so this board has room for everybody — reviews, games, reading and turning up all count, whether or not you have connected WaniKani.",
  you: "You",
  yourPlace: (place: number, total: number) => `You are ${ordinal(place)} of ${total}.`,
  yourPlaceMissing: "You are not on the board yet. Earn your first XP and you will be.",
  empty: "Nobody is on the board yet.",
  emptyHint: "The first member to earn any XP at all takes first place.",
  progressLabel: "Progress through this rank",
  into: (into: number, span: number) => `${into.toLocaleString()} / ${span.toLocaleString()} XP`,
  atTop: "Top rank",
  total: (xp: number) => `${xp.toLocaleString()} XP`,
  history: "Your XP history",
} as const;

/**
 * What the ladder chart says.
 *
 * Its own map beside the board's rather than folded into it: the board is
 * about people and this is about the ladder they are climbing, and a locale
 * layer will want to move one without reading the other.
 */
export const XP_LADDER_COPY = {
  title: "The ladder",
  blurb:
    "Every rank and what it asks for. The cost is that rank alone; the total is everything it took to stand there.",
  standings: "Standings",
  columnRank: "Rank",
  columnCost: "Costs",
  columnTotal: "Total",
  /* A rank nobody pays for wants a word rather than a zero: 0 XP in a column
     of prices reads as a bug, where "Start" reads as the fact it is. */
  start: "Start",
  amount: (xp: number) => `${xp.toLocaleString()} XP`,
  here: "You",
  whereYouAre: "Where you are",
  previousRung: "Passed",
  currentRung: "Now",
  nextRung: "Next",
  everyRung: "Every rank",
  hereTitle: (level: number, name: string) => `You are rank ${level}, ${name}`,
  reachedTitle: (level: number, name: string) => `Rank ${level}, ${name} — passed`,
  aheadTitle: (level: number, name: string) => `Rank ${level}, ${name}`,
  shape: (ranks: number, total: number) =>
    `${ranks} ranks, ${total.toLocaleString()} XP from the first day to the last.`,
} as const;

/** `1` -> `1st`. Only used for a placing, so only ever a small number. */
export function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  const ones = value % 10;
  if (ones === 1) return `${value}st`;
  if (ones === 2) return `${value}nd`;
  if (ones === 3) return `${value}rd`;
  return `${value}th`;
}
