/**
 * Walking results laid out in columns.
 *
 * One column took one pair of arrows. Several columns take four, and the
 * awkward part is that the columns are different lengths: WaniKani answers a
 * common character with forty rows and the school grades with one, so moving
 * right from row twenty has to land somewhere that exists rather than
 * nowhere. Every move lands on a real cell or refuses; nothing here can focus
 * a row that is not there.
 *
 * Kept as maths over column lengths, with no DOM in sight, because this is the
 * part that is easy to get subtly wrong and hard to see wrong on screen.
 */

export type GridCell = { column: number; row: number };

/** Where a move ends up: a cell, the search box, or nowhere at all. */
export type GridMove = GridCell | "input" | null;

export const GRID_KEYS = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  home: "Home",
  escape: "Escape",
} as const;

export type GridKey = (typeof GRID_KEYS)[keyof typeof GRID_KEYS];

export function isGridKey(key: string): key is GridKey {
  return (Object.values(GRID_KEYS) as string[]).includes(key);
}

export function isCell(move: GridMove): move is GridCell {
  return move !== null && move !== "input";
}

/**
 * The next cell for a key press.
 *
 * `lengths` is how many rows each column holds, in the order they are drawn.
 * Sideways keeps the row where it can and clamps to the last row where it
 * cannot, which is what a reader expects from a ragged grid: moving right from
 * row twenty into a column of three lands on its last row, not on nothing.
 *
 * Up off the top row goes to the search box, and so do Escape and Home,
 * because the way out has to be one press from anywhere. Home from anywhere
 * but the first row goes there first, so it is a way to the top as well as a
 * way out.
 */
export function nextCell(lengths: number[], current: GridCell, key: GridKey): GridMove {
  const height = lengths[current.column] ?? 0;
  if (height === 0) return null;

  if (key === GRID_KEYS.escape) return "input";

  if (key === GRID_KEYS.home) {
    /* Already at the top of the first column, so the only place left is out. */
    if (current.row === 0 && current.column === 0) return "input";
    return { column: current.column, row: 0 };
  }

  if (key === GRID_KEYS.up) {
    if (current.row > 0) return { column: current.column, row: current.row - 1 };
    return "input";
  }

  if (key === GRID_KEYS.down) {
    if (current.row + 1 < height) return { column: current.column, row: current.row + 1 };
    return null;
  }

  const step = key === GRID_KEYS.right ? 1 : -1;

  /*
   * Skips empty columns rather than stopping at one. A column with nothing in
   * it is not drawn, so stopping there would be stopping at a gap the reader
   * cannot see - the key would simply do nothing.
   */
  for (let column = current.column + step; column >= 0 && column < lengths.length; column += step) {
    const target = lengths[column] ?? 0;
    if (target === 0) continue;
    return { column, row: Math.min(current.row, target - 1) };
  }

  return null;
}

/**
 * Whether arrowing down here should ask for more rows.
 *
 * Only the column being walked matters: reaching the end of the school grades
 * is no reason to fetch more WaniKani.
 */
export function nearColumnEnd(lengths: number[], current: GridCell, lead: number): boolean {
  const height = lengths[current.column] ?? 0;
  return height > 0 && current.row + lead >= height;
}
