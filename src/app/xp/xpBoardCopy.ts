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
  /*
   * The distance to the member directly above, which is what turns a board
   * from a list into a target. Three states and they mean different things:
   * the leader has nobody to pass, a row level with the one above needs the
   * next point to break the tie, and everybody else has a number.
   */
  toPass: (amount: number) => `${amount.toLocaleString()} XP to pass`,
  toPassLevel: "Tied",
  leading: "Leading",
  /* Read out in place of the blank number on the repeat rows of a tie. */
  sharedPlace: (place: number) => `Joint ${place}`,
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
  /* The count beside a rank, read out rather than left as a bare number. */
  standingTitle: (count: number, name: string) =>
    `${count} ${count === 1 ? "member is" : "members are"} standing at ${name}`,

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

/**
 * One rank's own board.
 *
 * SPX named both ends in its blurb - what this level asks for and what the
 * next one does - and that is the pair a member standing here actually wants:
 * what it took to arrive, and what it takes to leave.
 */
export const XP_RANK_BOARD_COPY = {
  /* The scale, not the number again.
   *
   * The heading is `xpRankNameText`, so it now reads "L1 Rookie" like every
   * other rank on the site - it was the bare name until John asked which rank
   * Rookie actually was, on a page whose own nine rows each said "L1 Rookie"
   * underneath it. With the number in the heading, a subtitle reading "Rank 1
   * of 100" prints the 1 a second time in a second format directly beneath the
   * badge that just said it. What is worth keeping is the "of 100". */
  subtitle: (total: number) => `One of ${total} ranks`,
  /** What the browser tab and a pasted link carry, since the address cannot. */
  tabTitle: (rankName: string) => `${rankName} — UmaKuma`,
  needs: (needs: number) => `This rank starts at ${needs.toLocaleString()} XP.`,
  nextNeeds: (name: string, level: number, needs: number) =>
    `${name} (${level}) starts at ${needs.toLocaleString()} XP.`,
  atTop: "There is nothing above this one.",
  unlocks: (games: number) => `${games} games a day count toward XP at this rank.`,
  standing: "Standing here now",
  empty: "Nobody is standing here right now.",
  emptyHint: "Ranks empty as people climb past them.",
  back: "The whole board",
  chartLink: "See who is here",
} as const;

/**
 * How XP is earned, on its own page.
 *
 * SPX wrote its odds down in plain words rather than leaving them to be
 * inferred, and that is the half worth keeping. Ours goes further: the numbers
 * are read from the table the awards are paid from, so the page cannot say one
 * thing while the code does another.
 */
export const XP_EARN_COPY = {
  title: "How XP is earned",
  subtitle: "Every way, and what each one pays",
  blurb:
    "These numbers come from the same table the awards are paid from, so this page cannot drift from what actually happens. Anything not listed here does not pay XP.",
  columns: { what: "What", amount: "XP", cap: "Most a day" },
  uncapped: "No limit",
  capped: (cap: number) => cap.toLocaleString(),
  /* Reviews are deliberately uncapped and it is worth saying why, since every
     other repeatable kind has a ceiling. */
  capNote:
    "A ceiling stops one kind of activity from crowding out the rest. Reviews have none on purpose — capping study would mean telling somebody their work stopped counting.",
  count: (live: number) => `${live} ways to earn`,
  back: "The XP board",
  empty: "Nothing is priced yet.",
} as const;

/**
 * The weekly board.
 *
 * SPX headed it "Weekly XP Leaders: Week 23 of 2003" and sorted by the week
 * rather than the lifetime total, which is the one decision that makes it
 * worth having beside the other board.
 */
export const XP_WEEKLY_COPY = {
  title: "This week",
  subtitle: (year: number, week: number) => `Week ${week} of ${year}`,
  blurb:
    "Ranked by what was earned this week, not by what anybody has earned in all. A week is a fresh start, so this is the board somebody who joined last month can win.",
  range: (start: string, end: string) => `${start} to ${end}`,
  earned: (amount: number) => `${amount.toLocaleString()} XP`,
  lifetime: (amount: number) => `${amount.toLocaleString()} XP in all`,
  /* The distance line, in the week's own units rather than the lifetime's. */
  leading: "Leading this week",
  level: "Tied",
  toPass: (amount: number) => `${amount.toLocaleString()} XP to pass`,
  previous: "Last week",
  current: "This week",
  empty: "Nobody has earned anything this week yet.",
  emptyHint: "Answer a review and you will be the first.",
  back: "The whole board",
} as const;

/**
 * The promotions chart.
 *
 * SPX headed it "Promotion Chart for the Past 7 Days" and grouped by level,
 * highest first. A seven-day window is what keeps it short and current rather
 * than an ever-growing list nobody reads to the bottom.
 */
export const XP_PROMOTIONS_COPY = {
  title: "Promotions",
  subtitle: (days: number) => `Everyone who climbed a rank in the past ${days} days`,
  blurb:
    "Grouped by the rank reached, the biggest climb first. A single good day can carry somebody through more than one rank, and each of them is listed.",
  group: (level: number, name: string) => `Rank ${level}: ${name}`,
  groupNeeds: (needs: number) => `${needs.toLocaleString()} XP`,
  on: (day: string) => day,
  total: (xp: number) => `${xp.toLocaleString()} XP`,
  empty: "Nobody has climbed a rank this week.",
  emptyHint: "Ranks get dearer as you go, so a quiet week here is normal.",
  back: "The whole board",
} as const;

/** The row across the top of every XP page. */
export const XP_SECTION_NAV_COPY = {
  label: "XP pages",
  board: "Board",
  weekly: "This week",
  promotions: "Promotions",
  earn: "How XP is earned",
  mine: "My XP",
} as const;
