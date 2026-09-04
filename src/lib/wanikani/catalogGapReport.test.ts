import { describe, expect, it } from "vitest";

import { CATALOG_GAP_ID_LIMIT, buildCatalogGapReport } from "./catalogGapReport";

const MEASURED_AT = new Date("2026-09-04T05:00:00.000Z");

const gapOf = (missing: number[], wanted = missing, held: number[] = []) => ({ wanted, held, missing });

/**
 * A measurement is only useful if it names what is missing.
 *
 * The count on its own says a backfill is due; the ids say what it would fetch,
 * which is the difference between "run it and see" and knowing beforehand that
 * the hole is these kana-only words again.
 */
describe("the catalogue gap report", () => {
  it("counts each of the three lists", () => {
    const report = buildCatalogGapReport(gapOf([7, 9], [1, 7, 9], [1]), MEASURED_AT);

    expect(report.wantedCount).toBe(3);
    expect(report.heldCount).toBe(1);
    expect(report.missingCount).toBe(2);
  });

  it("names the missing ids", () => {
    expect(buildCatalogGapReport(gapOf([440, 441]), MEASURED_AT).missing).toEqual([440, 441]);
  });

  it("says when nothing is missing", () => {
    const report = buildCatalogGapReport(gapOf([], [440], [440]), MEASURED_AT);

    expect(report.missingCount).toBe(0);
    expect(report.missing).toEqual([]);
    expect(report.truncated).toBe(false);
  });

  it("stamps the measurement rather than a cache age", () => {
    expect(buildCatalogGapReport(gapOf([]), MEASURED_AT).measuredAt).toBe("2026-09-04T05:00:00.000Z");
  });

  /*
   * The cap is the difference between reporting a hole and trying to paint a
   * catalogue: measured against an empty table, every id it holds is missing.
   */
  it("caps the ids it hands back and says it did", () => {
    const many = Array.from({ length: CATALOG_GAP_ID_LIMIT + 40 }, (_, index) => index + 1);
    const report = buildCatalogGapReport(gapOf(many), MEASURED_AT);

    expect(report.missing).toHaveLength(CATALOG_GAP_ID_LIMIT);
    expect(report.missingCount).toBe(CATALOG_GAP_ID_LIMIT + 40);
    expect(report.truncated).toBe(true);
  });

  it("does not call a full list truncated", () => {
    const exact = Array.from({ length: CATALOG_GAP_ID_LIMIT }, (_, index) => index + 1);

    expect(buildCatalogGapReport(gapOf(exact), MEASURED_AT).truncated).toBe(false);
  });
});
