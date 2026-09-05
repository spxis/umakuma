import { describe, expect, it } from "vitest";

import {
  RADICAL_SHAPE_TWINS,
  RADICAL_SHAPE_TWINS_REVERSED,
  katakanaRomaji,
  radicalMeanings,
  radicalWkSubjectId,
} from "./radicalShapes";

/* WaniKani's own ids for the three shapes, so the test fails if a twin is
   pointed at the wrong subject rather than merely at some subject. */
const WK_IDS = new Map<string, number>([
  ["ト", 10], // toe
  ["丿", 5], // slide
  ["丨", 8761], // stick
  ["大", 18], // big — the ordinary case, spelled the same in both
]);

describe("radicalWkSubjectId", () => {
  it("pairs a radical spelled the same in both", () => {
    expect(radicalWkSubjectId("大", WK_IDS)).toBe(18);
  });

  /* The bug John found: he learned this one as toe and the card said
     divining, because 卜 and ト are different characters. */
  it("pairs 卜 with WaniKani's ト", () => {
    expect(radicalWkSubjectId("卜", WK_IDS)).toBe(10);
  });

  it("pairs the other two shapes WaniKani spells differently", () => {
    expect(radicalWkSubjectId("ノ", WK_IDS)).toBe(5);
    expect(radicalWkSubjectId("｜", WK_IDS)).toBe(8761);
  });

  it("pairs nothing when WaniKani does not teach the shape", () => {
    expect(radicalWkSubjectId("鬯", WK_IDS)).toBeNull();
    expect(radicalWkSubjectId("卜", new Map())).toBeNull();
    expect(radicalWkSubjectId("卜", undefined)).toBeNull();
  });

  /* Unicode will not do this for us, which is the reason the table is written
     by hand. If this ever starts passing, the table can go. */
  it("is not something normalisation would have solved", () => {
    for (const [ours, theirs] of Object.entries(RADICAL_SHAPE_TWINS)) {
      expect(ours.normalize("NFKC")).not.toBe(theirs.normalize("NFKC"));
    }
  });
});

describe("the twin table", () => {
  it("reverses cleanly, so a WaniKani surface can ask about us", () => {
    for (const [ours, theirs] of Object.entries(RADICAL_SHAPE_TWINS)) {
      expect(RADICAL_SHAPE_TWINS_REVERSED[theirs]).toBe(ours);
    }
    expect(Object.keys(RADICAL_SHAPE_TWINS_REVERSED)).toHaveLength(
      Object.keys(RADICAL_SHAPE_TWINS).length,
    );
  });

  it("pairs one shape with one shape, never many to one", () => {
    const theirs = Object.values(RADICAL_SHAPE_TWINS);
    expect(new Set(theirs).size).toBe(theirs.length);
  });

  it("holds single characters on both sides", () => {
    for (const [ours, twin] of Object.entries(RADICAL_SHAPE_TWINS)) {
      expect([...ours]).toHaveLength(1);
      expect([...twin]).toHaveLength(1);
    }
  });
});

describe("radicalMeanings", () => {
  it("keeps the dictionary's words when it has any", () => {
    expect(radicalMeanings("卜", ["divining", "fortune-telling"])).toEqual([
      "divining",
      "fortune-telling",
    ]);
  });

  /* The blank cards: six shapes no dictionary names, drawing the glyph where
     the meaning should be. */
  it("names the shapes no dictionary names", () => {
    expect(radicalMeanings("ノ", [])).toEqual(["no", "katakana no"]);
    expect(radicalMeanings("ユ", undefined)).toEqual(["yu", "katakana yu"]);
  });

  /* John's third rule: a katakana that is also a number takes the English
     number. ハ is the shape of 八. */
  it("gives a number shape its English number first", () => {
    expect(radicalMeanings("ハ", [])[0]).toBe("eight");
    expect(radicalMeanings("ハ", [])).toContain("ha");
  });

  /* John: "I do not want ANY null names for radicals." So a shape no rule can
     name stops the seed with the character printed, rather than writing a
     blank row that becomes a card drawing its own glyph. */
  it("refuses rather than shipping a radical with no name", () => {
    expect(() => radicalMeanings("鬯", [])).toThrow(/No name for the radical/);
    expect(() => radicalMeanings("鬯", [])).toThrow(/U\+9B2F/);
  });

  /* Derived from the katakana rather than listed, so a RADKFILE refresh that
     adds a seventh blank shape is named without anybody editing a list. */
  it("reads any katakana out, not only the ones blank today", () => {
    expect(radicalMeanings("ツ", [])).toEqual(["tsu", "katakana tsu"]);
    expect(radicalMeanings("ニ", [])[0]).toBe("two");
    expect(katakanaRomaji("ノ")).toBe("no");
    expect(katakanaRomaji("卜")).toBeNull();
  });

  /* WaniKani's radical names are their own invented content, so none of them
     is seeded into a curriculum everybody reads - fins, slide, toe and stick
     are resolved at display time for connected members instead. */
  /* John: "we don't want any WK stuff in our UK data." Their radical names are
     their invented content and are resolved at display time for connected
     members instead. */
  it("seeds none of WaniKani's invented names", () => {
    const blanks = ["ハ", "ノ", "ユ", "ヨ", "マ", "｜"];
    const seeded = blanks.flatMap((shape) => radicalMeanings(shape, [])).map((w) => w.toLowerCase());
    for (const theirs of ["fins", "slide", "toe", "stick", "hook", "wolverine", "mama"]) {
      expect(seeded).not.toContain(theirs);
    }
  });

  it("names every shape the dictionary leaves blank", () => {
    for (const shape of ["ハ", "ノ", "ユ", "ヨ", "マ", "｜"]) {
      const words = radicalMeanings(shape, []);
      expect(words.length).toBeGreaterThan(0);
      for (const word of words) expect(word.trim()).toBe(word);
    }
  });
});

describe("the ladder we actually ship", () => {
  /* The rules above are only worth having if they hold over the real 253.
     John: "I do not want ANY null names for radicals." */
  it("names every radical and pairs the three WaniKani spells differently", async () => {
    const { ladderSeedPlan } = await import("../../../scripts/uk-subjects-plan");
    const radicals = ladderSeedPlan().rows.filter((row) => row.kind === "radical");

    expect(radicals.length).toBeGreaterThan(200);
    expect(radicals.filter((row) => row.meanings.length === 0)).toEqual([]);

    const byCharacter = new Map(radicals.map((row) => [row.characters, row]));
    /* The one John found. 10 is WaniKani's toe. */
    expect(byCharacter.get("卜")?.wkSubjectId).toBe(10);
    expect(byCharacter.get("ノ")?.wkSubjectId).toBe(5);
    expect(byCharacter.get("｜")?.wkSubjectId).toBe(8761);
  });
});

describe("the two spellings of one shape", () => {
  /* 丿 is WaniKani's ノ and 丨 is their ｜. A caller handing in either gets the
     name we already decided, so the two spellings cannot drift apart. */
  it("names a shape the same under either spelling", () => {
    expect(radicalMeanings("丿", [])).toEqual(radicalMeanings("ノ", []));
    expect(radicalMeanings("丨", [])).toEqual(radicalMeanings("｜", []));
  });

  it("still prefers the dictionary when the twin spelling has one", () => {
    expect(radicalMeanings("丿", ["slash"])).toEqual(["slash"]);
  });
});
