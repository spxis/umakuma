/**
 * The Corners board: how a round is laid out, and which keys reach it.
 *
 * Split out of `gameMode` so the board's own vocabulary — the four quadrants,
 * the keys that answer on them, and the halves that only flash — stays in one
 * place. Re-exported from `@/lib/gameMode`, which is where callers import it.
 */

/** How many of the four corners a question lights up. */
export const GAME_CHOICE_COUNTS = [2, 3, 4] as const;

/**
 * The Corners board.
 *
 * Every round is played on the same four quadrants with the word between them,
 * whether two, three or four of them are live. The player always knows where an
 * answer can appear, and the keys are the numpad corners, which have the same
 * geometry as the board.
 */
export const GAME_CORNER_KEYS = ["7", "9", "1", "3"] as const;
export const GAME_CORNER_COUNT = GAME_CORNER_KEYS.length;

/**
 * Which keys answer with a tile.
 *
 * `corners` is the four-quadrant board. `sequence` is a strip of tiles numbered
 * left to right, which is what Map mode reads its prefecture names on.
 */
export const GAME_KEY_LAYOUTS = { corners: "corners", sequence: "sequence" } as const;

/** The halves of the board, and its middle, that no single key can answer. */
export const GAME_BOARD_REGIONS = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
  center: "center",
} as const;

export type GameChoiceCount = (typeof GAME_CHOICE_COUNTS)[number];
export type GameKeyLayout = (typeof GAME_KEY_LAYOUTS)[keyof typeof GAME_KEY_LAYOUTS];
export type GameBoardRegion = (typeof GAME_BOARD_REGIONS)[keyof typeof GAME_BOARD_REGIONS];

/**
 * Keyboard mapping for the answer tiles.
 *
 * The Corners board keeps the same four quadrants every round, so its keys are
 * the numpad corners: 7 and 9 across the top, 1 and 3 across the bottom. A strip
 * of tiles in one row has no corners to name, so Map mode numbers them instead.
 */
export function gameOptionIndexForKey(
  key: string,
  optionCount: number,
  layout: GameKeyLayout = GAME_KEY_LAYOUTS.corners,
): number | null {
  const index = layout === GAME_KEY_LAYOUTS.sequence
    ? "1234".indexOf(key)
    : GAME_CORNER_KEYS.indexOf(key as (typeof GAME_CORNER_KEYS)[number]);
  return index >= 0 && index < optionCount ? index : null;
}

/**
 * The part of the Corners board a key points at without naming one corner.
 *
 * Nothing on the board answers to these, so rather than swallow the press the
 * board flashes what the key covers: 8 and 2 the rows, 4 and 6 the columns, 5
 * the word in the middle. The arrows read as the same four directions.
 */
export function gameBoardRegionForKey(key: string): GameBoardRegion | null {
  if (key === "8" || key === "ArrowUp") return GAME_BOARD_REGIONS.top;
  if (key === "2" || key === "ArrowDown") return GAME_BOARD_REGIONS.bottom;
  if (key === "4" || key === "ArrowLeft") return GAME_BOARD_REGIONS.left;
  if (key === "6" || key === "ArrowRight") return GAME_BOARD_REGIONS.right;
  if (key === "5") return GAME_BOARD_REGIONS.center;
  return null;
}

/** Whether a flashed region covers the corner in this slot. Center covers none. */
export function gameRegionCoversCorner(region: GameBoardRegion, index: number): boolean {
  if (region === GAME_BOARD_REGIONS.top) return index < 2;
  if (region === GAME_BOARD_REGIONS.bottom) return index >= 2;
  if (region === GAME_BOARD_REGIONS.left) return index % 2 === 0;
  if (region === GAME_BOARD_REGIONS.right) return index % 2 === 1;
  return false;
}

export function isGameChoiceCount(value: number): value is GameChoiceCount {
  return GAME_CHOICE_COUNTS.includes(value as GameChoiceCount);
}

/** Historical runs stored only `hardMode`; three choices was what it meant. */
export function gameChoiceCountFrom(choiceCount: number | null | undefined, hardMode: boolean): GameChoiceCount {
  if (choiceCount && isGameChoiceCount(choiceCount)) return choiceCount;
  return hardMode ? 3 : 2;
}

