import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  STROKE_ANIMATION_COPY,
  STROKE_SIDE_WIDTH,
  STROKE_SIZES,
  STROKE_SIZE_VALUES,
} from "./strokeAnimationCopy";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * The numbers are the reason the size control exists: sixteen numerals on a
 * 200px drawing cannot be read, which made the Numbers button useless on the
 * characters that most need it.
 */
describe("the drawing sizes", () => {
  it("offers three, smallest first, so the row reads S M L", () => {
    expect(STROKE_SIZE_VALUES).toEqual(["small", "medium", "large"]);
  });

  it("rises with each step, and large is big enough to read a stroke number on", () => {
    const [small, medium, large] = STROKE_SIZE_VALUES.map((value) => STROKE_SIZES[value]);
    expect(small).toBeLessThan(medium!);
    expect(medium!).toBeLessThan(large!);
    expect(large).toBeGreaterThanOrEqual(300);
  });

  it("names every size for the reader", () => {
    for (const value of STROKE_SIZE_VALUES) {
      expect(STROKE_ANIMATION_COPY.sizes[value].length, value).toBe(1);
      expect(STROKE_ANIMATION_COPY.sizeTitle[value].length, value).toBeGreaterThan(3);
    }
  });

  /*
   * The drawing sits between the printed faces and its controls, and it is
   * centred only while those two are the same width. They were not - 140px of
   * glyph cells against 88px of buttons - and the drawing sat 28px right of
   * centre. One constant, used by both, is what keeps it true.
   */
  it("gives both sides of the drawing the same width, from one constant", () => {
    for (const path of ["src/app/shared/KanjiStrokeAnimation.tsx", "src/app/shared/KanjiDetailModal.tsx"]) {
      expect(read(path), path).toContain("STROKE_SIDE_WIDTH");
    }
    expect(STROKE_SIDE_WIDTH).toMatch(/^sm:w-/);
  });
});
