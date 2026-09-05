import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PillWordsToggle from "./PillWordsToggle";
import { SUBJECT_PAGE_COPY } from "./subject-page/SubjectPage.constants";

function draw(): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(<PillWordsToggle />)}</body>`).window.document;
}

/*
 * Segments rather than a button that cycles: a cycling button cannot say what
 * the other choices are, so a reader presses it until the page looks right.
 */
describe("the control over every chip's words", () => {
  const doc = draw();
  const buttons = [...doc.querySelectorAll('[role="group"] button')];

  it("shows all four choices at once", () => {
    expect(buttons.map((button) => button.textContent)).toEqual([
      SUBJECT_PAGE_COPY.pillWordsOff,
      SUBJECT_PAGE_COPY.pillWordsReading,
      SUBJECT_PAGE_COPY.pillWordsEnglish,
      SUBJECT_PAGE_COPY.pillWordsBoth,
    ]);
  });

  /* あ and EN are short enough for a heading row; the words are on the hover. */
  it("names each one for a reader who does not know the labels", () => {
    expect(buttons.map((button) => button.getAttribute("title"))).toEqual([
      SUBJECT_PAGE_COPY.pillWordsOffTitle,
      SUBJECT_PAGE_COPY.pillWordsReadingTitle,
      SUBJECT_PAGE_COPY.pillWordsEnglishTitle,
      SUBJECT_PAGE_COPY.pillWordsBothTitle,
    ]);
  });

  it("is one named group, not three loose buttons", () => {
    expect(doc.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(SUBJECT_PAGE_COPY.pillWordsLabel);
  });

  /* Levels are a second question, so they are a switch beside the segments,
     not a fifth segment - and they start on, because the confusables drew
     levels and the words in a compound did not until every chip obeyed one
     standing choice. */
  it("keeps the levels switch beside the segments, on by default", () => {
    const levels = [...doc.querySelectorAll("button")].find(
      (button) => button.textContent === SUBJECT_PAGE_COPY.pillLevels,
    );
    expect(levels).toBeDefined();
    expect(levels?.closest('[role="group"]')).toBeNull();
    expect(levels?.getAttribute("aria-pressed")).toBe("true");
    expect(levels?.getAttribute("title")).toBe(SUBJECT_PAGE_COPY.pillLevelsTitle);
  });

  /* The server cannot know what this browser stored, so it draws the default. */
  it("lights English on a first render", () => {
    const english = buttons.find((button) => button.textContent === SUBJECT_PAGE_COPY.pillWordsEnglish);
    expect(english?.getAttribute("class")).toContain("bg-accent");
  });
});
