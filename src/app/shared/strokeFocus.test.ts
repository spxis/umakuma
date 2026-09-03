import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  STROKE_FOCUS_CLASS,
  STROKE_FOCUS_STATES,
  strokeFocusState,
  strokeIsInCharacter,
  strokeNumbers,
} from "./strokeFocus";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * Three states, which is the whole feature: what is down, what is being drawn,
 * and what has not been reached. Two of them would be a progress bar.
 */
describe("the stroke being studied", () => {
  it("puts everything before it down, and nothing after it", () => {
    const states = [0, 1, 2, 3].map((index) => strokeFocusState(index, 3));
    expect(states).toEqual([
      STROKE_FOCUS_STATES.done,
      STROKE_FOCUS_STATES.done,
      STROKE_FOCUS_STATES.current,
      STROKE_FOCUS_STATES.ahead,
    ]);
  });

  /* The number a reader presses is one-based; the path's index is not. */
  it("counts strokes from one and paths from zero", () => {
    expect(strokeFocusState(0, 1)).toBe(STROKE_FOCUS_STATES.current);
    expect(strokeFocusState(1, 1)).toBe(STROKE_FOCUS_STATES.ahead);
  });

  it("opens on the first stroke with nothing yet down", () => {
    const states = [0, 1, 2].map((index) => strokeFocusState(index, 1));
    expect(states.filter((state) => state === STROKE_FOCUS_STATES.done)).toHaveLength(0);
    expect(states[0]).toBe(STROKE_FOCUS_STATES.current);
  });

  it("draws the last stroke onto a character that is otherwise finished", () => {
    const states = [0, 1, 2].map((index) => strokeFocusState(index, 3));
    expect(states.filter((state) => state === STROKE_FOCUS_STATES.ahead)).toHaveLength(0);
    expect(states.at(-1)).toBe(STROKE_FOCUS_STATES.current);
  });

  /* Grey, colour, nothing - and none of them the same, or there are not three states. */
  it("gives each state a colour of its own, and gives `ahead` none", () => {
    const classes = Object.values(STROKE_FOCUS_CLASS);
    expect(new Set(classes).size).toBe(classes.length);
    expect(STROKE_FOCUS_CLASS.ahead).toContain("transparent");
    expect(STROKE_FOCUS_CLASS.current).toContain("kanji");
    expect(STROKE_FOCUS_CLASS.done).not.toContain("kanji");
  });
});

describe("the row of numbers", () => {
  it("numbers every stroke of the character, from one", () => {
    expect(strokeNumbers(4)).toEqual([1, 2, 3, 4]);
  });

  /* A character with no strokes loaded yet has no numbers to offer. */
  it("offers nothing before the character has loaded", () => {
    expect(strokeNumbers(0)).toEqual([]);
    expect(strokeNumbers(-1)).toEqual([]);
  });
});

/*
 * The panel is reused rather than remounted when an explorer opens the next
 * character, so a stroke picked on 魔 would otherwise arrive on 一.
 */
describe("a stroke picked on another character", () => {
  it("belongs to the character only while that character has it", () => {
    expect(strokeIsInCharacter(12, 21)).toBe(true);
    expect(strokeIsInCharacter(12, 4)).toBe(false);
    expect(strokeIsInCharacter(1, 1)).toBe(true);
    expect(strokeIsInCharacter(0, 21)).toBe(false);
    expect(strokeIsInCharacter(null, 21)).toBe(false);
  });
});

describe("the picker in the panel", () => {
  const panel = () => read("src/app/shared/KanjiDetailModal.tsx");
  const animation = () => read("src/app/shared/KanjiStrokeAnimation.tsx");

  /*
   * Shut on arrival is the point: the panel is a drawing and a few buttons,
   * and it stays that way until somebody asks for a stroke.
   */
  it("opens onto stroke one rather than onto a question", () => {
    expect(panel()).toContain("onSelect(open ? null : 1)");
  });

  /* The stroke belongs to the character it was picked on, not to the panel. */
  it("keeps the picked stroke with its character", () => {
    expect(panel()).toContain("picked.kanji === kanji");
    expect(panel()).toContain("strokeIsInCharacter");
  });

  /*
   * The faint outline of the finished character is one switch for both views.
   *
   * It governed only the single-stroke view at first and vanished from the row
   * in the other, which reads as the control disappearing - and took the
   * choice away in the view where somebody might want the drawing clean.
   */
  it("draws the whole-character outline on the switch alone, in either view", () => {
    const source = animation();
    expect(source).toContain("{showOutline ? (");
    expect(source).not.toContain("selectedStroke === null || showOutline");
    expect(source).not.toContain("{selectedStroke !== null ? (");
  });

  /* Picking a stroke has to redraw, or the choice only changes the colours. */
  it("redraws when the choice changes", () => {
    expect(animation()).toContain("}, [data, playToken, selectedStroke]);");
  });
});
