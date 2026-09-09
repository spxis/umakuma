import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { srsStageLabelForStage } from "@/lib/srs/srsStageLabel";
import { srsThemeBuckets, srsThemeForRating, SRS_THEME_RATINGS } from "@/lib/srs/srsThemes";

import ThemeLadder from "./ThemeLadder";

const theme = srsThemeForRating("samurai", SRS_THEME_RATINGS.all);

function draw(): Document {
  const markup = renderToStaticMarkup(<ThemeLadder theme={theme} />);
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/**
 * A server render is the default mode by definition - the module store cannot
 * know what a browser chose - so this pins what an arriving member sees, which
 * is the half of the ticket that mattered.
 */
describe("the theme ladder, as a member first meets it", () => {
  it("leads every rung with the romaji, not the Japanese", () => {
    const rungs = draw().querySelectorAll("ol ol li");
    const levels = srsThemeBuckets(theme).flatMap((bucket) => bucket.levels);

    expect(rungs.length).toBe(levels.length);
    for (const [index, rung] of rungs.entries()) {
      const level = levels[index]!;
      const lead = rung.querySelector("span");
      expect(lead?.textContent).toBe(level.reading);
      /* The lead is Latin here, so it must not be marked as Japanese: a
         `lang="ja"` line of romaji is what makes Chrome offer to translate it. */
      expect(lead?.getAttribute("lang")).toBeNull();
    }
  });

  it("puts the English under each rung rather than the stage", () => {
    const text = draw().body.textContent ?? "";

    for (const bucket of srsThemeBuckets(theme)) {
      for (const level of bucket.levels) {
        expect(text).toContain(level.meaning);
      }
    }
    /* The anchor belongs to the Japanese mode: in romaji the word is already
       legible and the stage would only be noise. */
    expect(text).not.toContain(srsStageLabelForStage(1));
  });

  it("keeps both scripts and the meaning on the hover title", () => {
    const rung = draw().querySelector("ol ol li");
    const level = srsThemeBuckets(theme)[0]!.levels[0]!;
    const title = rung?.getAttribute("title") ?? "";

    expect(title).toContain(level.term);
    expect(title).toContain(level.reading);
    expect(title).toContain(level.meaning);
  });
});
