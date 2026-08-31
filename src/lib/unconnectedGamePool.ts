/**
 * The catalogue slice a player with no WaniKani connection plays from.
 *
 * The games drew only from an account's own WaniKani assignments, so somebody
 * who had never connected had a pool of nothing - Match and Shiritori both
 * answered "Only 0 eligible items are available" while the lobby offered them
 * and the welcome copy promised them by name. The subjects were never personal:
 * they are the shared catalogue, which Daily Challenge has always played
 * straight off. The assignments are a filter, not the source.
 *
 * Client-safe on purpose, so the rule can be tested and so the lobby could show
 * the ceiling without reaching for the server module.
 */
/**
 * How far up the catalogue a player with no WaniKani may draw.
 *
 * Not the whole catalogue: sixty levels of vocabulary is not a game, it is a
 * dictionary, and a beginner meeting level 55 kanji in a four-way match learns
 * nothing from it. Ten is roughly where WaniKani's own free tier stops, which
 * makes it the level a newcomer could plausibly have reached elsewhere.
 */
export const UNCONNECTED_GAME_LEVEL_CAP = 10;

/**
 * The level ceiling for a pool drawn from the catalogue rather than a ladder.
 *
 * A level asked for explicitly wins outright - picking level 3 means level 3,
 * not "up to 3". Otherwise the ceiling is the cap, or the player's own WaniKani
 * level when that is higher: an account whose assignments have gone stale but
 * which reached level 30 should not be dropped back to beginner content.
 */
export function unconnectedPoolLevelCap(level: number | null, wkLevel: number | null): number {
  if (level !== null) return level;
  return Math.max(wkLevel ?? 0, UNCONNECTED_GAME_LEVEL_CAP);
}
