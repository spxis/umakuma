import { describe, expect, it } from "vitest";

import { READING_KIND_DISPLAY, READING_KIND_VALUES, READING_KINDS } from "./domainConstants";
import { formatReading, romajiForReading } from "./readingDisplay";

/**
 * A reading, written the way a dictionary writes it.
 *
 * The sources disagree: KANJIDIC writes on readings in katakana, the school
 * tables sometimes in hiragana, WaniKani everything in hiragana. A student
 * should see one convention - on in katakana, kun in hiragana - because the
 * script is what tells the two apart before the label is read.
 */
describe("which script a reading is written in", () => {
  it("writes an on reading in katakana whichever way it arrived", () => {
    expect(formatReading(READING_KINDS.on, "すい")).toBe("スイ");
    expect(formatReading(READING_KINDS.on, "スイ")).toBe("スイ");
  });

  it("writes a kun reading in hiragana whichever way it arrived", () => {
    expect(formatReading(READING_KINDS.kun, "みず")).toBe("みず");
    expect(formatReading(READING_KINDS.kun, "ミズ")).toBe("みず");
  });

  it("writes a name reading in hiragana", () => {
    expect(formatReading(READING_KINDS.nanori, "ミナ")).toBe("みな");
  });

  /* た.べる marks where the okurigana starts; it is notation, not the word. */
  it("drops the okurigana markers", () => {
    expect(formatReading(READING_KINDS.kun, "た.べる")).toBe("たべる");
    expect(formatReading(READING_KINDS.kun, "みず・")).toBe("みず");
  });
});

describe("the romaji beside a reading", () => {
  it("spells the kana in Latin letters", () => {
    expect(romajiForReading("スイ")).toBe("sui");
    expect(romajiForReading("みず")).toBe("mizu");
  });

  it("says nothing where it would only echo", () => {
    expect(romajiForReading("")).toBeNull();
    expect(romajiForReading("-")).toBeNull();
    expect(romajiForReading("abc")).toBeNull();
    expect(romajiForReading(null)).toBeNull();
  });
});

/* The word a student meets on a test, beside the English every time. */
describe("what each kind is called", () => {
  it("names every kind in both languages", () => {
    for (const kind of READING_KIND_VALUES) {
      const display = READING_KIND_DISPLAY[kind];
      expect(display.label).toMatch(/readings$/);
      expect(display.ja).toMatch(/^[぀-ヿ一-鿿]+$/);
      expect(display.romaji.length).toBeGreaterThan(3);
    }
    expect(READING_KIND_DISPLAY.on.ja).toBe("音読み");
    expect(READING_KIND_DISPLAY.kun.ja).toBe("訓読み");
  });
});
