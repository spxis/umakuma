import { describe, expect, it } from "vitest";

import { toPaginationPlacement } from "@/app/shared/paginationPlacement";

import { DEFAULT_SHEET_SIZE, toSheetSize } from "./practiceCopy";
import { PRACTICE_PAGINATION_DEFAULT, PRINT_NOW_PARAM, sheetHref, type SheetSettings } from "./sheetLink";

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
  showNumbers: true,
  placement: PRACTICE_PAGINATION_DEFAULT,
  size: DEFAULT_SHEET_SIZE,
  choosing: false,
  picked: "",
  printAll: false,
};

function read(href: string) {
  const params = new URLSearchParams(href.slice(1));
  return {
    placement: toPaginationPlacement(params.get("pager"), PRACTICE_PAGINATION_DEFAULT),
    size: toSheetSize(params.get("size")),
    showModel: params.get("model") !== "0",
    showReadings: params.get("readings") === "1",
    showNumbers: params.get("numbers") !== "0",
    printAll: params.get("print") === "all",
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
    expect(href).not.toContain("numbers=");
  });

  /*
   * Numbering defaults on, the opposite way round from readings, so its
   * parameter has to appear when it is switched off rather than on. Reading it
   * back against the wrong default silently renumbers a sheet somebody
   * deliberately left plain.
   */
  it("survives a round trip when the rows are left unnumbered", () => {
    expect(read(sheetHref(BASE, { showNumbers: false })).showNumbers).toBe(false);
    expect(read(sheetHref({ ...BASE, showNumbers: false }, { size: "large" })).showNumbers).toBe(false);
  });
});


describe("a sheet built from chosen characters", () => {
  /*
   * The chosen set travels in the URL, so it has to survive every other
   * control on the page. Changing the square size on a picked sheet must not
   * quietly empty it back to a grade.
   */
  it("keeps the chosen characters when another control changes", () => {
    const href = sheetHref({ ...BASE, source: "picked", picked: "一二三" }, { size: "large" });
    const picked = new URLSearchParams(href.slice(1)).get("picked");
    expect(picked).toBe("一二三");
  });

  it("stays out of the link for a sheet that has none", () => {
    expect(sheetHref(BASE)).not.toContain("picked=");
  });
});


describe("the print layout", () => {
  it("stays chosen when another control changes", () => {
    // Resizing the squares of a print layout means a resized print layout.
    expect(read(sheetHref({ ...BASE, printAll: true }, { size: "small" })).printAll).toBe(true);
  });

  it("keeps the sheet's other settings on the way in and out", () => {
    const configured: SheetSettings = { ...BASE, size: "small", showReadings: true, placement: "top" };

    const printing = read(sheetHref(configured, { printAll: true, page: 1 }));
    expect(printing.printAll).toBe(true);
    expect(printing.size).toBe("small");
    expect(printing.showReadings).toBe(true);

    const back = read(sheetHref({ ...configured, printAll: true }, { printAll: false, page: 1 }));
    expect(back.printAll).toBe(false);
    expect(back.placement).toBe("top");
  });

  it("stays out of the link for a sheet being read rather than printed", () => {
    expect(sheetHref(BASE)).not.toContain("print=");
  });

  /*
   * The flag that opens the print dialog is a one-shot. If `sheetHref` ever
   * carried it, every option the reader touched while in the print layout -
   * a different size, the next run - would reopen the dialog on arrival.
   */
  it("never carries the open-the-dialog flag", () => {
    const everySetting: SheetSettings = {
      ...BASE,
      printAll: true,
      choosing: true,
      picked: "一二三",
      showModel: false,
      showReadings: true,
      placement: "none",
      size: "large",
    };
    expect(sheetHref(everySetting)).not.toContain(`${PRINT_NOW_PARAM}=`);
  });
});
