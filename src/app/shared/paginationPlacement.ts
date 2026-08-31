/**
 * Where a paged surface puts its pager, and the words it uses.
 *
 * Four answers rather than a boolean, because "top and bottom" is the one a
 * long sheet actually wants and "neither" is what a surface that pages some
 * other way needs. The type is shared so a surface can store the choice or
 * carry it in a URL without inventing its own spelling of "both".
 */

export const PAGINATION_PLACEMENTS = ["top", "bottom", "both", "none"] as const;

export type PaginationPlacement = (typeof PAGINATION_PLACEMENTS)[number];

/** The two slots a surface renders; a placement decides which ones draw. */
export type PaginationSlot = "top" | "bottom";

export const DEFAULT_PAGINATION_PLACEMENT: PaginationPlacement = "bottom";

export const PAGINATION_COPY = {
  label: "Pagination",
  page: "Page",
  of: "of",
  previous: "Previous",
  next: "Next",
} as const;

/** Read a placement off a URL or storage, falling back rather than throwing. */
export function toPaginationPlacement(
  value: string | null | undefined,
  fallback: PaginationPlacement = DEFAULT_PAGINATION_PLACEMENT,
): PaginationPlacement {
  return PAGINATION_PLACEMENTS.includes(value as PaginationPlacement)
    ? (value as PaginationPlacement)
    : fallback;
}
