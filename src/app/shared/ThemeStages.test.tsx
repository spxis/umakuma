import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ThemeStagesPanel from "@/app/users/[nickname]/theme/ThemeStagesPanel";
import { SRS_BUCKET_TITLE_LABELS } from "@/lib/domainConstants";
import { srsThemeBuckets, srsThemes, srsThemeForRating, SRS_THEME_RATINGS } from "@/lib/srs/srsThemes";

import { THEME_PAGE_COPY } from "./themeCopy";

const theme = srsThemeForRating("samurai", SRS_THEME_RATINGS.all);

function draw(): Document {
  const markup = renderToStaticMarkup(
    <ThemeStagesPanel
      accountId="acc_1"
      initialTheme={theme}
      initialChoices={[theme]}
      initialAgeBand="18_plus"
    />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/**
 * The page exists to answer one question - what will a review call this - and
 * the answer is only complete at ten rungs. Nine is the shape of the ladder;
 * the tenth is the one an item has not left, and a member who has not started
 * something still meets its name.
 */
describe("a theme, stage by stage", () => {
  it("draws all ten stages, nought to nine", () => {
    const rows = draw().querySelectorAll("tbody tr");

    expect(rows).toHaveLength(10);
    expect(theme.levels.map((level) => level.level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("names every rung in the theme's own words", () => {
    const text = draw().body.textContent ?? "";

    for (const level of theme.levels) {
      expect(text).toContain(level.term);
      expect(text).toContain(level.meaning);
    }
  });

  /*
   * The only stage vocabulary a member arriving from WaniKani already has. A
   * table of unfamiliar names in an unfamiliar order is a list of words until
   * something in it is a word they know.
   */
  it("says what WaniKani calls each stage beside it", () => {
    const text = draw().body.textContent ?? "";

    for (const label of Object.values(SRS_BUCKET_TITLE_LABELS)) {
      if (label === "Unknown" || label === "Locked") continue;
      expect(text).toContain(label);
    }
    expect(text).toContain(THEME_PAGE_COPY.notStarted);
  });

  it("offers the browser rather than a second copy of it", () => {
    const text = draw().body.textContent ?? "";

    expect(text).toContain(THEME_PAGE_COPY.tiers);
    /* The tier ladder, not a flat row: four rungs under the first tier. */
    expect(srsThemeBuckets(theme)[0].levels).toHaveLength(4);
  });

  /* Every theme is drawable here, so none may be short a rung. */
  it("gives every theme we offer all ten rungs", () => {
    for (const entry of srsThemes()) {
      expect(entry.levels.map((level) => level.level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });
});
