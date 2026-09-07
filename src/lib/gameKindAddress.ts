import { GAME_KINDS, GAME_KIND_VALUES, type GameKind } from "./gameMode";
/**
 * A game's name in an address.
 *
 * The stored values are what the database holds and cannot be renamed - a
 * Prisma enum member outlives the code - so `revenge` and `time_attack` are
 * spelled the way a member reads them in a URL, and read back the same way.
 */
export const GAME_KIND_SLUGS: Record<GameKind, string> = {
  [GAME_KINDS.match]: "match",
  [GAME_KINDS.daily]: "daily-challenge",
  [GAME_KINDS.revenge]: "practice",
  [GAME_KINDS.timeAttack]: "time-attack",
  [GAME_KINDS.shiritori]: "shiritori",
  [GAME_KINDS.map]: "map",
  /* Addressable so a completed test can be linked to, though nothing in the
     games hub routes here - a test is reached by finishing a level. */
  [GAME_KINDS.levelTest]: "level-test",
};

export function gameKindForSlug(slug: string | undefined | null): GameKind | null {
  if (!slug) return null;
  const wanted = slug.trim().toLowerCase();
  return GAME_KIND_VALUES.find((kind) => GAME_KIND_SLUGS[kind] === wanted) ?? null;
}

/** Where a game is played, for a member. */
export function gameKindHref(member: string, kind: GameKind | null): string {
  const base = `/users/${encodeURIComponent(member)}/game`;
  return kind ? `${base}/${GAME_KIND_SLUGS[kind]}` : base;
}

/**
 * Where a member's own finished games are listed.
 *
 * A real route, unlike the kinds above, which are segments the game client
 * reads. It sits beside them as a static segment - a literal beats the
 * `[[...kind]]` catch-all - and `history` is deliberately not one of the
 * slugs, so neither can shadow the other.
 */
export function gameHistoryHref(member: string): string {
  return `${gameKindHref(member, null)}/history`;
}
