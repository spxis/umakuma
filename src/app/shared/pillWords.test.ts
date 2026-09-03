import { describe, expect, it } from "vitest";

import {
  DEFAULT_PILL_WORD_MODE,
  PILL_WORD_MODES,
  PILL_WORD_MODE_VALUES,
  isPillWordMode,
  pillWords,
  pillWordsTitle,
} from "./pillWords";

/*
 * The chips printed `キ · cape` - both questions answered at once, which
 * nobody had chosen. These are the rules of the choice that replaced it.
 */
describe("the words on a chip", () => {
  it("says nothing at all when the member wants glyphs", () => {
    expect(pillWords(PILL_WORD_MODES.off, "やま", "mountain")).toBeNull();
  });

  it("answers one question at a time", () => {
    expect(pillWords(PILL_WORD_MODES.reading, "やま", "mountain")).toBe("やま");
    expect(pillWords(PILL_WORD_MODES.english, "やま", "mountain")).toBe("mountain");
  });

  /*
   * A radical WaniKani draws has a name and no reading at all. Asking for
   * readings must not empty a whole row of them: the member asked to see
   * less, not to see nothing, and a blank chip reads as a page that broke.
   */
  it("falls back to the word the chip actually has", () => {
    expect(pillWords(PILL_WORD_MODES.reading, null, "Leaf")).toBe("Leaf");
    expect(pillWords(PILL_WORD_MODES.english, "しゅく", null)).toBe("しゅく");
    expect(pillWords(PILL_WORD_MODES.reading, "  ", "Leaf")).toBe("Leaf");
  });

  it("has nothing to say about a chip that knows neither", () => {
    for (const mode of PILL_WORD_MODE_VALUES) {
      expect(pillWords(mode, null, null)).toBeNull();
      expect(pillWords(mode, "", "   ")).toBeNull();
    }
  });
});

/* Hiding a word costs a hover, not the fact. */
describe("what the title carries", () => {
  it("keeps both halves whatever is drawn", () => {
    expect(pillWordsTitle("やま", "mountain")).toBe("やま · mountain");
  });

  it("carries the half it has, and nothing for neither", () => {
    expect(pillWordsTitle(null, "Leaf")).toBe("Leaf");
    expect(pillWordsTitle("しゅく", null)).toBe("しゅく");
    expect(pillWordsTitle(null, null)).toBeNull();
  });
});

describe("the stored choice", () => {
  it("opens on English, so a strange character is legible before it is readable", () => {
    expect(DEFAULT_PILL_WORD_MODE).toBe(PILL_WORD_MODES.english);
  });

  /* Three states, not four: "both" is the thing being retired. */
  it("offers three and only three", () => {
    expect(PILL_WORD_MODE_VALUES).toEqual(["off", "reading", "english"]);
    expect(isPillWordMode("both")).toBe(false);
    expect(isPillWordMode("english")).toBe(true);
  });
});
