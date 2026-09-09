/**
 * @vitest-environment jsdom
 */
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { sweepSources } from "@/lib/sourceSweep";

import LevelFilterChips from "./LevelFilterChips";

function chipLabels(markup: string): string[] {
  const { window } = new JSDOM(`<!doctype html><body>${markup}</body>`);
  return Array.from(window.document.querySelectorAll("button"))
    .map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter(Boolean);
}

/* John's History, as it stood: sixty-three levels with attempts on them, drawn
   one chip each, thirteen lines deep on a phone above the list he opened the
   page for. */
const SPARSE_LEVELS = [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 17, 18, 19, 25, 26, 27, 51, 59, 97];
const COUNTS = Object.fromEntries(SPARSE_LEVELS.map((level, index) => [level, index + 1]));

describe("a ladder of levels as a filter", () => {
  it("folds a hundred levels into decades", () => {
    const labels = chipLabels(
      renderToStaticMarkup(
        <LevelFilterChips label="Level" levels={SPARSE_LEVELS} counts={COUNTS} allCount={190} selected="all" onSelect={() => {}} />,
      ),
    );

    expect(labels).toContain("1-10(36)");
    expect(labels).toContain("91-97(19)");
    /* The whole point: no chip stands for a single level while the row is
       folded, however many levels the member has attempts on. */
    expect(labels.filter((label) => /^\d+\(/.test(label))).toEqual([]);
  });

  it("leaves out a decade nothing landed in", () => {
    const labels = chipLabels(
      renderToStaticMarkup(
        <LevelFilterChips label="Level" levels={SPARSE_LEVELS} counts={COUNTS} allCount={190} selected="all" onSelect={() => {}} />,
      ),
    );

    /* Nothing between 28 and 50 except 51-60's own, so the forties are absent
       rather than drawn as an empty control. */
    expect(labels.some((label) => label.startsWith("31-40"))).toBe(false);
    expect(labels.some((label) => label.startsWith("41-50"))).toBe(false);
  });

  it("opens the decade holding the level that is chosen", () => {
    const labels = chipLabels(
      renderToStaticMarkup(
        <LevelFilterChips label="Level" levels={SPARSE_LEVELS} counts={COUNTS} allCount={190} selected={26} onSelect={() => {}} />,
      ),
    );

    expect(labels).toContain("25(14)");
    expect(labels).toContain("26(15)");
    /* And only that one: the other decades stay folded. */
    expect(labels).toContain("1-10(36)");
  });
});

describe("hiding a chip on a phone", () => {
  /*
   * `hidden sm:inline-flex` does not hide a filter chip.
   *
   * Every chip carries `inline-flex` in `FILTER_CHIP_CLASS`, and a bare
   * `hidden` does not beat a bare `inline-flex` - Tailwind emits both as plain
   * display utilities and the later one in the stylesheet wins, not the later
   * one in the attribute. Four rows across the study explorer were written this
   * way and none of them ever collapsed; the ellipsis that opens them was
   * drawn, because `sm:hidden` on it is a variant and variants do win.
   * `max-sm:hidden` is the same intent expressed as the variant.
   */
  it("is written as a variant, so it beats the chip's own display class", () => {
    expect(sweepSources("hidden sm:inline-flex", ["src"])).toEqual([]);
  });

  it("keeps the chosen chip visible while the row is folded", () => {
    const markup = renderToStaticMarkup(
      <LevelFilterChips label="Level" levels={SPARSE_LEVELS} counts={COUNTS} allCount={190} selected="all" onSelect={() => {}} />,
    );
    const { window } = new JSDOM(`<!doctype html><body>${markup}</body>`);
    const chosen = Array.from(window.document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("All"),
    );
    expect(chosen?.className).not.toContain("max-sm:hidden");
  });
});
