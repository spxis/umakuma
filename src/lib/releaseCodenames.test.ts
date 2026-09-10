import { describe, expect, it } from "vitest";

import { APP_VERSION } from "./appVersion";
import {
  CODENAMES,
  GOJUON_SEQUENCE,
  codenameForRelease,
  codenameForVersion,
  codenameKanaForRelease,
  codenameKanji,
  toHiragana,
} from "./releaseCodenames";

describe("the gojuon sequence", () => {
  it("has the 44 usable initials, skipping wo and n", () => {
    expect(GOJUON_SEQUENCE).toHaveLength(44);
    expect(GOJUON_SEQUENCE).not.toContain("を");
    expect(GOJUON_SEQUENCE).not.toContain("ん");
  });
});

describe("codenameKanaForRelease", () => {
  it("starts at あ and walks in order", () => {
    expect(codenameKanaForRelease(1)).toEqual({ kana: "あ", cycle: 1 });
    expect(codenameKanaForRelease(2)).toEqual({ kana: "い", cycle: 1 });
    expect(codenameKanaForRelease(44)).toEqual({ kana: "わ", cycle: 1 });
  });

  it("rolls over to a new cycle after わ", () => {
    expect(codenameKanaForRelease(45)).toEqual({ kana: "あ", cycle: 2 });
    expect(codenameKanaForRelease(88)).toEqual({ kana: "わ", cycle: 2 });
    expect(codenameKanaForRelease(89)).toEqual({ kana: "あ", cycle: 3 });
  });
});

describe("toHiragana", () => {
  it("maps katakana to hiragana and leaves the rest alone", () => {
    expect(toHiragana("ラーメン")).toBe("らーめん");
    expect(toHiragana("るんるんルリビタキ")).toBe("るんるんるりびたき");
    expect(toHiragana("すし")).toBe("すし");
  });
});

describe("the codename list", () => {
  it("names every release up to the current version, and may plan ahead", () => {
    const minor = Number(APP_VERSION.split(".")[1]);
    expect(CODENAMES.length).toBeGreaterThanOrEqual(minor);
  });

  it("starts every reading on its release's kana", () => {
    CODENAMES.forEach((codename, index) => {
      const { kana } = codenameKanaForRelease(index + 1);
      expect(
        toHiragana(codename.reading).startsWith(kana),
        `release ${index + 1} "${codename.romaji}" should start with ${kana}`,
      ).toBe(true);
    });
  });

  it("never reuses a name pair", () => {
    for (const field of ["romaji", "ja", "reading"] as const) {
      const values = CODENAMES.map((codename) => codename[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  it("gives every name an English gloss", () => {
    for (const codename of CODENAMES) {
      expect(codename.gloss.length, codename.romaji).toBeGreaterThan(3);
    }
  });

  it("never uses the same word twice anywhere in the list", () => {
    // Particles are grammar, not words: な and の may recur.
    const PARTICLES = new Set(["na", "no"]);
    const seen = new Map<string, string>();
    for (const codename of CODENAMES) {
      for (const word of codename.romaji.toLowerCase().split(/\s+/)) {
        if (PARTICLES.has(word)) {
          continue;
        }
        expect(
          seen.has(word),
          `"${word}" appears in both "${seen.get(word)}" and "${codename.romaji}"`,
        ).toBe(false);
        seen.set(word, codename.romaji);
      }
    }
  });
});

describe("codenameKanji", () => {
  it("gives the kanji form to print beside the reading", () => {
    expect(codenameKanji({ romaji: "Natsumatsuri Naruto", ja: "夏祭り鳴門", reading: "なつまつりなると", gloss: "x" })).toBe("夏祭り鳴門");
  });

  /*
   * Tobikiri Tonkatsu is written in kana, so `ja` and `reading` are the same
   * string. Printing both would repeat the name rather than teach anything.
   */
  it("returns nothing for a name already written in kana", () => {
    expect(codenameKanji({ romaji: "Tobikiri Tonkatsu", ja: "とびきりとんかつ", reading: "とびきりとんかつ", gloss: "x" })).toBeNull();
  });

  it("leaves no shipped codename repeating itself", () => {
    const repeated = CODENAMES.filter((entry) => entry.ja === entry.reading).map((entry) => entry.romaji);
    expect(repeated).toEqual(["Tobikiri Tonkatsu"]);
  });
});

describe("lookups", () => {
  it("finds a codename by minor and by version string", () => {
    expect(codenameForRelease(3)?.romaji).toBe("Ureshii Uma");
    expect(codenameForVersion("0.8.0")?.romaji).toBe("Kuroi Kuma");
  });

  it("returns null past the end of the list", () => {
    expect(codenameForRelease(CODENAMES.length + 1)).toBeNull();
    expect(codenameForVersion("not-a-version")).toBeNull();
  });
});

/**
 * The number these take is the release, and it has not been the minor since
 * the major went to 1.
 *
 * `codenameKanaForRelease` was `codenameKanaForMinor` while both of its callers
 * passed the ordinal, and on 2026-09-10 two sessions second-checking 1.110.0's
 * codename reached for the minor the name asked for. 110 gives に; the release
 * is 607 and its kana is も. Nothing failed - the wrong answer arrived looking
 * exactly like the right one, which is what a hand-check is for and why the
 * name mattered.
 */
describe("the number a codename is looked up by", () => {
  it("is the release ordinal, not the version minor", () => {
    expect(codenameKanaForRelease(607).kana).toBe("\u3082");
    expect(codenameKanaForRelease(110).kana).toBe("\u306b");
  });

  it("wraps the gojuon every 44 releases, and 44 itself is the last kana", () => {
    /* The edge that a `release % 44` shorthand gets wrong: it yields 0 here
       and names nothing, where the run's 44th release is the 44th kana. */
    expect(codenameKanaForRelease(44)).toEqual({ kana: "\u308f", cycle: 1 });
    expect(codenameKanaForRelease(45)).toEqual({ kana: "\u3042", cycle: 2 });
  });
});
