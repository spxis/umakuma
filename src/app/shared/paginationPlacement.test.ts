import { describe, expect, it } from "vitest";

import { shouldShowPagination } from "./SurfacePagination";
import { PAGINATION_PLACEMENTS, toPaginationPlacement, type PaginationSlot } from "./paginationPlacement";

/**
 * The whole point of the option is that a surface renders both slots once and
 * the placement decides. If a slot draws when it should not, a long sheet gets
 * two pagers where it asked for one - or none where it asked for two.
 */

const SLOTS: PaginationSlot[] = ["top", "bottom"];

describe("where a pager draws", () => {
  it.each([
    ["top", true, false],
    ["bottom", false, true],
    ["both", true, true],
    ["none", false, false],
  ] as const)("%s shows top=%s bottom=%s", (placement, top, bottom) => {
    expect(shouldShowPagination(placement, "top")).toBe(top);
    expect(shouldShowPagination(placement, "bottom")).toBe(bottom);
  });

  it("covers every placement the type allows", () => {
    for (const placement of PAGINATION_PLACEMENTS) {
      const drawn = SLOTS.filter((slot) => shouldShowPagination(placement, slot));
      expect(drawn.length, placement).toBe(
        placement === "both" ? 2 : placement === "none" ? 0 : 1,
      );
    }
  });
});

describe("reading a placement off a URL", () => {
  it("takes the four it knows", () => {
    for (const placement of PAGINATION_PLACEMENTS) {
      expect(toPaginationPlacement(placement)).toBe(placement);
    }
  });

  it("falls back rather than throwing on anything else", () => {
    expect(toPaginationPlacement("sideways")).toBe("bottom");
    expect(toPaginationPlacement(null)).toBe("bottom");
    expect(toPaginationPlacement(undefined, "both")).toBe("both");
  });
});
