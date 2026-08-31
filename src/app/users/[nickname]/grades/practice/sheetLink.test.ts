import { describe, expect, it } from "vitest";

import { toPaginationPlacement } from "@/app/shared/paginationPlacement";

import { DEFAULT_SHEET_SIZE, toSheetSize } from "./practiceCopy";
import { PRACTICE_PAGINATION_DEFAULT, sheetHref, type SheetSettings } from "./sheetLink";

/**
 * The sheet keeps its whole state in the URL, so a configured sheet is still a
 * link. That only works if writing a setting and reading it back agree - and
 * the two nearly did not, because the shared pager defaults to the foot while
 * this sheet defaults to both ends. Omitting "the default" against the wrong
 * one turns a chosen "Bottom" into "Both" on the very next page load.
 */

const BASE: SheetSettings = {
  source: "grade",
  grade: 1,
  level: 1,
  page: 1,
  mode: "trace",
  showModel: true,
  showReadings: false,
  placement: PRACTICE_PAGINATION_DEFAULT,
  size: DEFAULT_SHEET_SIZE,
  choosing: false,
};

function read(href: string) {
  const params = new URLSearchParams(href.slice(1));
  return {
    placement: toPaginationPlacement(params.get("pager"), PRACTICE_PAGINATION_DEFAULT),
    size: toSheetSize(params.get("size")),
    showModel: params.get("model") !== "0",
    showReadings: params.get("readings") === "1",
  };
}

describe("a sheet's link", () => {
  it("survives a round trip for every pager placement", () => {
    for (const placement of ["top", "bottom", "both", "none"] as const) {
      expect(read(sheetHref(BASE, { placement })).placement, placement).toBe(placement);
    }
  });

  it("survives a round trip for every square size", () => {
    for (const size of ["large", "medium", "small"] as const) {
      expect(read(sheetHref(BASE, { size })).size, size).toBe(size);
    }
  });

  it("keeps every other setting when one control changes", () => {
    const configured: SheetSettings = {
      ...BASE,
      placement: "top",
      size: "small",
      showModel: false,
      showReadings: true,
    };

    // Changing the size must not quietly reset the pager, the model or readings.
    const after = read(sheetHref(configured, { size: "large" }));
    expect(after.size).toBe("large");
    expect(after.placement).toBe("top");
    expect(after.showModel).toBe(false);
    expect(after.showReadings).toBe(true);
  });

  it("leaves defaults out, so an untouched sheet has a short address", () => {
    const href = sheetHref(BASE);
    expect(href).not.toContain("pager=");
    expect(href).not.toContain("size=");
    expect(href).not.toContain("model=");
    expect(href).not.toContain("readings=");
  });
});
