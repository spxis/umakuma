/**
 * How big the radicals are drawn in the picker.
 *
 * A grid of 253 characters is read by shape, and the shape is the whole
 * information: 冫 and 氵 differ by one stroke, and at the size that fits the
 * most radicals on a screen they are the same smudge. Older eyes and a phone
 * both want them bigger, and a reader hunting through the whole set wants them
 * smaller - so it is a control rather than a decision, kept per browser.
 *
 * Four steps rather than a free zoom: every step has to stay on the pixel grid
 * that keeps the rows even, and a slider would offer sizes that draw badly.
 */
import { getStoredEnum, setStoredEnum } from "./clientStorage";

export const RADICAL_GRID_SIZES = ["sm", "md", "lg", "xl"] as const;

export type RadicalGridSize = (typeof RADICAL_GRID_SIZES)[number];

/** Bigger than the grid first shipped at, which was too small on both. */
export const RADICAL_GRID_DEFAULT: RadicalGridSize = "lg";

export const RADICAL_GRID_SIZE_KEY = "wr:radical-grid:size";

/** The cell, and the stroke-count marker that has to line up with it. */
export const RADICAL_GRID_CLASSES: Record<RadicalGridSize, { cell: string; marker: string }> = {
  sm: { cell: "h-6 w-6 text-[13px]", marker: "h-6 min-w-6 text-[10px]" },
  md: { cell: "h-7 w-7 text-[15px]", marker: "h-7 min-w-7 text-[10px]" },
  lg: { cell: "h-8 w-8 text-[18px]", marker: "h-8 min-w-8 text-[11px]" },
  xl: { cell: "h-10 w-10 text-[22px]", marker: "h-10 min-w-10 text-xs" },
};

/** One step along, clamped: the ends stay put rather than wrapping around. */
export function stepRadicalGridSize(size: RadicalGridSize, by: 1 | -1): RadicalGridSize {
  const index = RADICAL_GRID_SIZES.indexOf(size);
  const next = Math.min(RADICAL_GRID_SIZES.length - 1, Math.max(0, index + by));
  return RADICAL_GRID_SIZES[next]!;
}

/**
 * The chosen size, read the way the recent items are read.
 *
 * Through a store rather than into state after mount: the server has no
 * localStorage and renders the default, so setting the stored size in an
 * effect would make the first client render disagree with the HTML that
 * arrived - the same hydration mismatch a list inside a paragraph caused.
 */
const listeners = new Set<() => void>();

let snapshot: RadicalGridSize = RADICAL_GRID_DEFAULT;
let read = false;

export function subscribeRadicalGridSize(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function radicalGridSizeSnapshot(): RadicalGridSize {
  if (!read) {
    snapshot = getStoredEnum(RADICAL_GRID_SIZE_KEY, RADICAL_GRID_SIZES, RADICAL_GRID_DEFAULT);
    read = true;
  }
  return snapshot;
}

/** The server, and the first paint, know only the default. */
export function radicalGridSizeServerSnapshot(): RadicalGridSize {
  return RADICAL_GRID_DEFAULT;
}

export function setRadicalGridSize(size: RadicalGridSize): void {
  snapshot = size;
  read = true;
  setStoredEnum(RADICAL_GRID_SIZE_KEY, size);
  for (const listener of listeners) listener();
}
