import type { CatalogGap } from "./catalogGap";

/**
 * The gap, in the shape a screen can show.
 *
 * `findCatalogGap` answers with three full id lists, and the one worth reading
 * is the third: a measurement that says "98 missing" without naming them tells
 * an operator a backfill is due but not what it would fetch. The ids are the
 * answer, so they travel - capped, because the same call on an empty catalogue
 * would otherwise hand back every id it holds and the panel would try to paint
 * nine thousand of them.
 *
 * Separate from `catalogGap.ts` because that module is `server-only`: this is
 * the part a client component needs the type of.
 */

/** How many ids one measurement reports. Enough for a real hole; not a catalogue. */
export const CATALOG_GAP_ID_LIMIT = 200;

export type CatalogGapReport = {
  /** When the measurement ran, ISO. Not cached, so this is always now. */
  measuredAt: string;
  /** Ids the app can reach, from assignments and from held rows' relations. */
  wantedCount: number;
  /** Rows the catalogue holds. */
  heldCount: number;
  /** How many of the wanted it cannot answer for. */
  missingCount: number;
  /** Those ids, up to `CATALOG_GAP_ID_LIMIT` of them. */
  missing: number[];
  /** Whether `missing` was cut short of `missingCount`. */
  truncated: boolean;
};

export function buildCatalogGapReport(
  gap: CatalogGap,
  measuredAt: Date,
  limit: number = CATALOG_GAP_ID_LIMIT,
): CatalogGapReport {
  const missingCount = gap.missing.length;

  return {
    measuredAt: measuredAt.toISOString(),
    wantedCount: gap.wanted.length,
    heldCount: gap.held.length,
    missingCount,
    missing: gap.missing.slice(0, Math.max(0, limit)),
    truncated: missingCount > Math.max(0, limit),
  };
}
