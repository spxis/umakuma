import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { JlptWordExample } from "@/lib/jlptTypes";

import type { JlptItem } from "../../explorerTypes";
import JlptExplorerDetailSection from "./JlptExplorerDetailSection";
import { JLPT_EXPLORER_TEXT } from "./JlptExplorer.constants";

const ITEM: JlptItem = {
  kanji: "丁",
  nLevel: 1,
  strokeCount: 2,
  frequencyRank: 1312,
  schoolGrade: 3,
  heisigKeyword: "street",
  unicodeHex: "4e01",
  sourceJlpt: 1,
  primaryMeaning: "street",
  meanings: ["street", "block"],
  onReadings: ["ちょう"],
  kunReadings: [],
  nanoriReadings: [],
  notes: [],
};

const WORDS: JlptWordExample[] = [
  { written: "包丁", pronounced: "ほうちょう", gloss: "kitchen knife" },
];

function render(
  wordExamples: JlptWordExample[] | null,
  wordExamplesError = false,
): Document {
  const markup = renderToStaticMarkup(
    <JlptExplorerDetailSection
      selectedItem={ITEM}
      showEnglish
      studyMode={false}
      userKanjiByChar={new Map()}
      wordExamples={wordExamples}
      wordExamplesError={wordExamplesError}
      statsOpen={false}
      kanjiStats={null}
      kanjiStatsLoading={false}
      kanjiStatsError={null}
      onToggleStatsOpen={() => undefined}
    />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/*
 * The compounds used to arrive with the page: every one of the 2,211 rows
 * carried its own, which was 9.8MB of a 10.5MB payload so that the one open
 * panel could show them. They are fetched per kanji now, so this panel has
 * three states where it used to have one.
 */
describe("the words panel, now that the words arrive separately", () => {
  it("says it is looking rather than showing an empty panel", () => {
    const text = render(null).body.textContent ?? "";
    expect(text).toContain(JLPT_EXPLORER_TEXT.wordsLoading);
    expect(text).not.toContain("包丁");
  });

  it("shows the words once they land", () => {
    const text = render(WORDS).body.textContent ?? "";
    expect(text).toContain("包丁");
    expect(text).toContain("ほうちょう");
    expect(text).toContain("kitchen knife");
    expect(text).not.toContain(JLPT_EXPLORER_TEXT.wordsLoading);
  });

  /*
   * Loading is not empty and empty is not an error: a kanji with no compounds
   * shows no panel, which is what it showed before any of this.
   */
  it("shows no panel at all for a kanji with no compounds", () => {
    const text = render([]).body.textContent ?? "";
    expect(text).not.toContain(JLPT_EXPLORER_TEXT.wordsHeading);
    expect(text).not.toContain(JLPT_EXPLORER_TEXT.wordsLoading);
  });

  it("says so when the lookup failed, rather than claiming there are none", () => {
    const text = render(null, true).body.textContent ?? "";
    expect(text).toContain(JLPT_EXPLORER_TEXT.wordsError);
    expect(text).not.toContain(JLPT_EXPLORER_TEXT.wordsLoading);
  });

  /* Study mode hides English; the compounds are English and stay hidden. */
  it("shows nothing about words in study mode", () => {
    const markup = renderToStaticMarkup(
      <JlptExplorerDetailSection
        selectedItem={ITEM}
        showEnglish={false}
        studyMode
        userKanjiByChar={new Map()}
        wordExamples={WORDS}
        wordExamplesError={false}
        statsOpen={false}
        kanjiStats={null}
        kanjiStatsLoading={false}
        kanjiStatsError={null}
        onToggleStatsOpen={() => undefined}
      />,
    );
    expect(markup).not.toContain(JLPT_EXPLORER_TEXT.wordsHeading);
    expect(markup).not.toContain("包丁");
  });
});
