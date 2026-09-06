/**
 * A level always says whose it is.
 *
 * The site drew every level as a bare `L17`, from the days when there was only
 * one ladder and it was WaniKani's. There are two now, and a naked number is a
 * question with two answers — a member reading `L3` on a word inside UmaKuma
 * level 1 has no way to know which system just spoke.
 *
 * Prefixing is what makes it safe to show them side by side: `WK17` and `UK17`
 * can sit on the same pill and mean different things without either one having
 * to be hidden or explained.
 *
 * Deliberately not a display map keyed by an enum. There are three ladders,
 * they are named in the product, and a member reads these strings more often
 * than almost anything else on the site.
 *
 * A fourth prefix lives elsewhere: `L` is the XP rank, in `xpRanks.ts`, and it
 * is bare because it only ever appears beside the XP total that names it.
 */
export const LEVEL_SYSTEMS = {
  /** WaniKani's sixty. */
  wanikani: "WK",
  /** Ours, ordered by the exam. A hundred. */
  umakuma: "UN",
  /**
   * A member's own uploaded library, which is a third ladder with as many
   * levels as they gave it.
   *
   * Left bare for a while on the grounds that the library is named right
   * beside the number - "Business Japanese (L3)" - and that was defensible
   * until `L` was reserved for the XP rank. A bare `L3` beside a library name
   * now reads as rank 3, which is a different ladder and a different number.
   */
  library: "LIB",
} as const;

export type LevelSystem = (typeof LEVEL_SYSTEMS)[keyof typeof LEVEL_SYSTEMS];

/**
 * `WK17`. Null for no level, so a caller can draw nothing rather than `WK0` —
 * an unlevelled subject is not on level zero, it is not on the ladder.
 */
export function levelBadge(system: LevelSystem, level: number | null | undefined): string | null {
  return typeof level === "number" ? `${system}${level}` : null;
}

/** The common case: WaniKani's level, or null. */
export function wkLevelBadge(level: number | null | undefined): string | null {
  return levelBadge(LEVEL_SYSTEMS.wanikani, level);
}

/** Ours. */
export function ukLevelBadge(level: number | null | undefined): string | null {
  return levelBadge(LEVEL_SYSTEMS.umakuma, level);
}

/** A member's own library. */
export function libraryLevelBadge(level: number | null | undefined): string | null {
  return levelBadge(LEVEL_SYSTEMS.library, level);
}
