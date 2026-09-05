import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AGE_BANDS, type AgeBand } from "@/lib/srs/ageBand";
import { ratingFor } from "@/lib/srs/ageBand";
import { srsThemesFor } from "@/lib/srs/srsThemes";
import { FORCED_AVOID_TAGS, THEME_QUIZ_OPTIONS } from "@/lib/srs/srsThemeTags";

import ThemeQuestionnaire from "./ThemeQuestionnaire";
import { THEME_QUIZ_COPY } from "./profileCopy";

function draw(ageBand: AgeBand | null): Document {
  const themes = srsThemesFor(ratingFor(ageBand));
  const markup = renderToStaticMarkup(
    <ThemeQuestionnaire
      themes={themes}
      ageBand={ageBand}
      currentThemeId="samurai"
      busy={false}
      onPick={() => {}}
    />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/**
 * The way in to ninety themes.
 *
 * What has to hold on first paint: every question is on screen and skippable,
 * an account that has not said it is eighteen can see the two chips its band
 * has decided for it and cannot un-tick them, and nothing here is a control
 * inside another control.
 */
describe("the theme questionnaire", () => {
  it("asks all five questions and offers every option", () => {
    const page = draw(AGE_BANDS.adult);
    const text = page.body.textContent ?? "";
    for (const question of Object.values(THEME_QUIZ_COPY.questions)) expect(text).toContain(question);
    for (const options of Object.values(THEME_QUIZ_OPTIONS)) {
      for (const tag of options) expect(text).toContain(THEME_QUIZ_COPY.tags[tag]);
    }
  });

  /* Skipping is a path, not a dead end: the unanswered panel says what to do
     rather than reading as "nothing matched". */
  it("starts unanswered, and says so rather than showing an empty grid", () => {
    const page = draw(AGE_BANDS.adult);
    expect(page.body.textContent).toContain(THEME_QUIZ_COPY.unanswered);
    expect(page.body.textContent).not.toContain(THEME_QUIZ_COPY.noMatches);
    expect(page.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  /*
   * The age band's decision is drawn, not hidden. A member should be able to
   * see what the account has taken off the table on their behalf.
   */
  it("locks the underworld chips on for an account that has not said it is 18", () => {
    for (const band of [null, AGE_BANDS.under13, AGE_BANDS.teen]) {
      const page = draw(band);
      const locked = [...page.querySelectorAll("button")].filter((button) =>
        FORCED_AVOID_TAGS.some((tag) => button.textContent === THEME_QUIZ_COPY.tags[tag]),
      );
      expect(locked, String(band)).toHaveLength(FORCED_AVOID_TAGS.length);
      for (const button of locked) {
        expect(button.hasAttribute("disabled"), String(band)).toBe(true);
        expect(button.getAttribute("aria-pressed"), String(band)).toBe("true");
      }
      expect(page.body.textContent).toContain(THEME_QUIZ_COPY.forcedBlurb);
    }
  });

  it("leaves the chips alone for an account that has said it is 18", () => {
    const page = draw(AGE_BANDS.adult);
    expect(page.querySelectorAll("button[disabled]")).toHaveLength(0);
    expect(page.body.textContent).not.toContain(THEME_QUIZ_COPY.forcedBlurb);
  });

  /* A control never contains another control. */
  it("nests no interactive element inside another", () => {
    const page = draw(AGE_BANDS.adult);
    const interactive = "a[href], button, input, select, textarea, [role=button], [tabindex]";
    for (const element of page.querySelectorAll(interactive)) {
      expect(element.querySelector(interactive), element.outerHTML.slice(0, 120)).toBeNull();
    }
  });
});
