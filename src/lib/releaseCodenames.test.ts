import { describe, expect, it } from "vitest";

import { APP_VERSION } from "./appVersion";
import {
  CODENAMES,
  GOJUON_SEQUENCE,
  codenameForMinor,
  codenameForVersion,
  codenameKanaForMinor,
  toHiragana,
} from "./releaseCodenames";

describe("the gojuon sequence", () => {
  it("has the 44 usable initials, skipping wo and n", () => {
    expect(GOJUON_SEQUENCE).toHaveLength(44);
    expect(GOJUON_SEQUENCE).not.toContain("を");
    expect(GOJUON_SEQUENCE).not.toContain("ん");
  });
});

describe("codenameKanaForMinor", () => {
  it("starts at あ and walks in order", () => {
    expect(codenameKanaForMinor(1)).toEqual({ kana: "あ", cycle: 1 });
    expect(codenameKanaForMinor(2)).toEqual({ kana: "い", cycle: 1 });
    expect(codenameKanaForMinor(44)).toEqual({ kana: "わ", cycle: 1 });
  });

  it("rolls over to a new cycle after わ", () => {
    expect(codenameKanaForMinor(45)).toEqual({ kana: "あ", cycle: 2 });
    expect(codenameKanaForMinor(88)).toEqual({ kana: "わ", cycle: 2 });
    expect(codenameKanaForMinor(89)).toEqual({ kana: "あ", cycle: 3 });
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
      const { kana } = codenameKanaForMinor(index + 1);
      expect(
        toHiragana(codename.reading).startsWith(kana),
        `v0.${index + 1}.0 "${codename.romaji}" should start with ${kana}`,
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

describe("lookups", () => {
  it("finds a codename by minor and by version string", () => {
    expect(codenameForMinor(3)?.romaji).toBe("Ureshii Uma");
    expect(codenameForVersion("0.8.0")?.romaji).toBe("Kuroi Kuma");
  });

  it("returns null past the end of the list", () => {
    expect(codenameForMinor(CODENAMES.length + 1)).toBeNull();
    expect(codenameForVersion("not-a-version")).toBeNull();
  });
});
