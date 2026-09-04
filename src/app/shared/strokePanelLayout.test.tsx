import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { STROKE_ANIMATION_COPY } from "./strokeAnimationCopy";

const read = (file: string) => readFileSync(join(process.cwd(), "src/app/shared", file), "utf8");

/*
 * John, on the stroke order card: can someone guess what each thing does? Why
 * is "10 strokes" a different badge from the Worksheet button - do those
 * belong together? The card held nine separate things and read as a wall.
 */
describe("what the stroke order card asks of a reader", () => {
  const panel = read("KanjiDetailModal.tsx");
  const animation = read("KanjiStrokeAnimation.tsx");

  /*
   * A fact and an action sat in one slot, styled almost alike. The header
   * keeps the action; the count went to the control it describes.
   */
  it("keeps the header for the title and what leaves the page", () => {
    const header = panel.slice(panel.indexOf("<header"), panel.indexOf("</header>"));
    expect(header).toContain("{actions}");
    expect(header).not.toContain("strokeCount");
  });

  /* The count is the button: what tells you there are ten offers you the ten. */
  it("makes the count the way into the strokes", () => {
    const picker = panel.slice(panel.indexOf("function StrokePicker"), panel.indexOf("function StrokePicker") + 2200);
    expect(picker).toContain("aria-expanded={open}");
    expect(picker).toContain("STROKE_ANIMATION_COPY.strokes");
    expect(picker).toContain("{count}");
  });

  /* The two labels the pair of controls used to need are gone with it. */
  it("no longer needs a word for either half", () => {
    expect(STROKE_ANIMATION_COPY).not.toHaveProperty("pickStroke");
    expect(STROKE_ANIMATION_COPY).not.toHaveProperty("pickAll");
    expect(STROKE_ANIMATION_COPY.pickTitle).toBeTruthy();
  });

  /*
   * Replay is a verb; outline, numbers and this-stroke answer one question.
   * They were five identical lit pills in a column with nothing to say which
   * were alike, so the three share a border now.
   */
  it("groups the display switches and leaves the verb out of them", () => {
    const group = animation.slice(animation.indexOf('aria-label={STROKE_ANIMATION_COPY.showLabel}'));
    const end = group.indexOf("</div>", group.indexOf("STROKE_ANIMATION_COPY.solo"));
    const inside = group.slice(0, end);
    expect(inside).toContain("STROKE_ANIMATION_COPY.outline");
    expect(inside).toContain("STROKE_ANIMATION_COPY.numbers");
    expect(inside).toContain("STROKE_ANIMATION_COPY.solo");
    expect(inside).not.toContain("STROKE_ANIMATION_COPY.replay");
  });

  /* Three switches do not fit one line beside the drawing, so the group wraps. */
  it("lets the group wrap rather than run off the card", () => {
    const group = animation.slice(animation.indexOf('aria-label={STROKE_ANIMATION_COPY.showLabel}'));
    expect(group.slice(0, 600)).toContain("flex-wrap");
  });

  /* The one title on a subject page that led nowhere. */
  it("lets the title lead to its own page", () => {
    expect(panel).toContain("titleHref");
  });
});
