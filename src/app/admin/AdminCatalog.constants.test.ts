import { describe, expect, it } from "vitest";

import { CATALOG_GAP_COPY } from "./AdminCatalog.constants";
import { buildCatalogGapReport } from "@/lib/wanikani/catalogGapReport";

const MEASURED_AT = new Date("2026-09-04T05:00:00.000Z");

const reportOf = (missing: number[], wantedExtra = 0, held = 0, limit?: number) =>
  buildCatalogGapReport(
    {
      missing,
      wanted: [...missing, ...Array.from({ length: wantedExtra }, (_, index) => 100000 + index)],
      held: Array.from({ length: held }, (_, index) => 200000 + index),
    },
    MEASURED_AT,
    limit,
  );

/**
 * The wording of a hole in the catalogue.
 *
 * Production holds everything the app asks for, so the sentences that matter -
 * the ones naming a gap - are only ever seen when something has gone wrong.
 * They are tested here because they cannot be checked by looking.
 */
describe("what the gap card says", () => {
  it("reports a clean catalogue by its size, not by silence", () => {
    expect(CATALOG_GAP_COPY.headline(reportOf([], 9387))).toBe("Nothing missing. All 9,387 wanted subject(s) are held.");
    expect(CATALOG_GAP_COPY.toast(reportOf([], 9387))).toBe("The catalogue holds everything the app asks for.");
  });

  it("names the size of a gap against the whole", () => {
    expect(CATALOG_GAP_COPY.headline(reportOf([1, 2, 3], 9384))).toBe("3 of 9,387 wanted subject(s) are missing.");
    expect(CATALOG_GAP_COPY.toast(reportOf([1, 2, 3], 9384))).toBe("3 subject(s) missing from the catalogue.");
  });

  it("groups the thousands so a four-figure count is readable", () => {
    expect(CATALOG_GAP_COPY.headline(reportOf(Array.from({ length: 1200 }, (_, index) => index + 1)))).toContain("1,200 of");
  });

  /* A capped list that called itself the whole gap would send a backfill out short. */
  it("says when the ids are only the first of them", () => {
    expect(CATALOG_GAP_COPY.idsHeading(reportOf([1, 2, 3, 4, 5], 0, 0, 2))).toBe("Missing ids (first 2)");
  });

  it("does not qualify a complete list", () => {
    expect(CATALOG_GAP_COPY.idsHeading(reportOf([1, 2, 3]))).toBe("Missing ids");
  });

  it("reports the held rows alongside", () => {
    expect(CATALOG_GAP_COPY.held(reportOf([], 0, 9429))).toContain("Held rows: 9,429.");
  });
});
