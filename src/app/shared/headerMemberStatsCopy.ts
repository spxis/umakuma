import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";

/**
 * What the header's member strip says, in one map for the locale layer.
 *
 * The numbers themselves carry the meaning — `1,240 XP`, `UG23`, `WK17` — so
 * this is mostly the words a screen reader gets instead of three bare figures.
 * A sighted member reads the badge; someone hearing the page read out needs to
 * be told which ladder is speaking, which is the same reason `levelBadge`
 * exists at all.
 *
 * Every one of the four is a link now, so each title says where it goes as
 * well as what it is. A title that only names the number leaves the one thing
 * a member cannot see — that the badge is a door — to hover and luck.
 */
export const HEADER_MEMBER_STATS_COPY = {
  /** Names the strip as the member's own, against the site numbers it replaced. */
  label: "Your progress",
  xp: (xp: number) => `${xp.toLocaleString()} XP`,
  xpTitle: "Your XP history",
  /*
   * Names the path, not just the number. `UN` and `UG` are two letters that
   * look alike at a glance and mean two orderings of the same 2,235 kanji, and
   * the header is where a member meets their own most often - the board this
   * opens says the same thing at length in `LADDER_BOARD_COPY.streamsNote`.
   */
  umakumaLevelTitle: (stream: LadderStreamValue, level: number) =>
    stream === LADDER_STREAMS.ug
      ? `UmaKuma level ${level} on the school-year path. See where you stand.`
      : `UmaKuma level ${level} on the JLPT path. See where you stand.`,
  wanikaniLevelTitle: (level: number) => `WaniKani level ${level}. See where you stand.`,
  /*
   * The theme is a name, not a number, so unlike the ladders it says what it
   * is on the way past. A screen reader gets the whole sentence in the title;
   * the strip itself has room for the name alone.
   */
  themeTitle: (name: string) => `Your stages are named after ${name}. Read the whole theme, or switch.`,
} as const;
