import { describe, expect, it } from "vitest";

import { copyName } from "./listCopy";

describe("what a copied list is called", () => {
  it("keeps the name when nothing of yours answers to it", () => {
    expect(copyName("Week 1", ["Week 2"])).toBe("Week 1");
  });

  it("marks the copy when the name is taken, and counts up", () => {
    expect(copyName("Week 1", ["Week 1"])).toBe("Week 1 (copy)");
    expect(copyName("Week 1", ["Week 1", "Week 1 (copy)"])).toBe("Week 1 (copy 2)");
  });

  /* "week-1" and "Week 1" share an address, which is what the save route refuses. */
  it("compares by address, not by spelling", () => {
    expect(copyName("Week 1", ["week-1"])).toBe("Week 1 (copy)");
  });
});
