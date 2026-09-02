import { describe, expect, it } from "vitest";

import {
  RADICAL_GRID_CLASSES,
  RADICAL_GRID_DEFAULT,
  RADICAL_GRID_SIZES,
  stepRadicalGridSize,
} from "./radicalGridSize";

describe("stepRadicalGridSize", () => {
  it("walks one step at a time", () => {
    expect(stepRadicalGridSize("md", 1)).toBe("lg");
    expect(stepRadicalGridSize("md", -1)).toBe("sm");
  });

  /* The ends hold rather than wrapping, or Larger would suddenly go smallest. */
  it("stops at each end", () => {
    expect(stepRadicalGridSize("xl", 1)).toBe("xl");
    expect(stepRadicalGridSize("sm", -1)).toBe("sm");
  });

  it("draws every size it offers", () => {
    for (const size of RADICAL_GRID_SIZES) {
      expect(RADICAL_GRID_CLASSES[size].cell).toBeTruthy();
      expect(RADICAL_GRID_CLASSES[size].marker).toBeTruthy();
    }
  });

  it("starts bigger than the smallest, which is what shipped and was too small", () => {
    expect(RADICAL_GRID_SIZES.indexOf(RADICAL_GRID_DEFAULT)).toBeGreaterThan(0);
  });
});
