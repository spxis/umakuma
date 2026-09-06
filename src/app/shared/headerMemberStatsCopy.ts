/**
 * What the header's member strip says, in one map for the locale layer.
 *
 * The numbers themselves carry the meaning — `1,240 XP`, `UK23`, `WK17` — so
 * this is mostly the words a screen reader gets instead of three bare figures.
 * A sighted member reads the badge; someone hearing the page read out needs to
 * be told which ladder is speaking, which is the same reason `levelBadge`
 * exists at all.
 */
export const HEADER_MEMBER_STATS_COPY = {
  /** Names the strip as the member's own, against the site numbers it replaced. */
  label: "Your progress",
  xp: (xp: number) => `${xp.toLocaleString()} XP`,
  xpTitle: "Your XP history",
  umakumaLevelTitle: (level: number) => `UmaKuma level ${level}`,
  wanikaniLevelTitle: (level: number) => `WaniKani level ${level}`,
  /*
   * The theme is a name, not a number, so unlike the ladders it says what it
   * is on the way past. A screen reader gets the whole sentence in the title;
   * the strip itself has room for the name alone.
   */
  themeTitle: (name: string) => `Your stages are named after ${name}. Read the whole theme, or switch.`,
} as const;
