import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  STROKE_ANIMATION_COPY,
  STROKE_MS_PER_STROKE,
  strokeRunMs,
  STROKE_SIDE_WIDTH,
  STROKE_SIZES,
  STROKE_SIZE_VALUES,
  STROKE_OUTLINE_STORAGE_KEY,
  STROKE_SIZE_STORAGE_KEY,
  STROKE_LOOP_PAUSE_MS,
  STROKE_LOOP_STORAGE_KEY,
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

/*
 * The whole character behind the ink, and the repeat.
 *
 * Both are switches the panel remembers, and both start on: a first stroke
 * alone in an empty box has nothing to place it against, and watching a stroke
 * order twice used to mean finding Replay and pressing it again.
 */
describe("the outline mode", () => {
  it("is named for what it shows, not for the feature", () => {
    expect(STROKE_ANIMATION_COPY.outline).toBe("Outline");
    expect(STROKE_ANIMATION_COPY.outlineTitle).toBe("Show the whole character faintly behind");
  });

  it("remembers itself under its own key, apart from the size", () => {
    expect(STROKE_OUTLINE_STORAGE_KEY).toBe("umakuma:stroke-outline");
    expect(STROKE_OUTLINE_STORAGE_KEY).not.toBe(STROKE_SIZE_STORAGE_KEY);
  });
});

describe("the repeat", () => {
  it("names Replay as the switch it now is", () => {
    expect(STROKE_ANIMATION_COPY.replay).toBe("Replay");
    expect(STROKE_ANIMATION_COPY.replayTitle).toBe("Draw it again and again");
  });

  /*
   * A rest between runs. Without it the last stroke lands and the page blanks
   * in the same instant, which reads as a glitch rather than a repeat.
   */
  it("rests a second between runs", () => {
    expect(STROKE_LOOP_PAUSE_MS).toBe(1000);
  });

  it("remembers itself apart from the outline and the size", () => {
    expect(STROKE_LOOP_STORAGE_KEY).toBe("umakuma:stroke-loop");
    expect(new Set([STROKE_LOOP_STORAGE_KEY, STROKE_OUTLINE_STORAGE_KEY, STROKE_SIZE_STORAGE_KEY]).size).toBe(3);
  });
});

/*
 * The repeat used to refuse to run whenever a single stroke was chosen, on
 * the grounds that a held stroke is not moving. It is: the chosen stroke draws
 * itself exactly as the others do, and watching one stroke over and over is
 * the whole reason somebody picks a stroke and turns the repeat on.
 */
describe("how long one run lasts", () => {
  it("is every stroke, plus a second to read it, for the whole character", () => {
    expect(strokeRunMs(12, null)).toBe(12 * STROKE_MS_PER_STROKE + STROKE_LOOP_PAUSE_MS);
  });

  it("is one stroke when one is chosen, whichever it is", () => {
    const once = strokeRunMs(12, 0);
    expect(strokeRunMs(12, 8)).toBe(once);
    expect(once).toBeGreaterThan(STROKE_MS_PER_STROKE);
  });

  /*
   * The rest is a share of the drawing, not a fixed second. A second after one
   * 420ms stroke leaves it sitting finished for seventy per cent of every
   * cycle: the loop runs and looks broken, which is the same thing to whoever
   * is watching. Half the cycle spent still is the most it may be.
   */
  it("never rests longer than it draws", () => {
    for (const selected of [0, 5, null]) {
      const run = strokeRunMs(12, selected);
      const drawMs = (selected === null ? 12 : 1) * STROKE_MS_PER_STROKE;
      expect(run - drawMs, `${selected} rests longer than it draws`).toBeLessThanOrEqual(drawMs);
    }
  });

  /* A character with no strokes would otherwise loop with no wait at all. */
  it("never waits for nothing", () => {
    expect(strokeRunMs(0, null)).toBeGreaterThan(STROKE_MS_PER_STROKE);
  });
});
