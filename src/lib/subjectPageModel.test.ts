import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES, SRS_BUCKETS } from "./domainConstants";
import { RELATED_GROUPS } from "./relatedSubjects";
import type { CatalogRelatedReference, CatalogSubjectDetail } from "./subjectCatalogDetails";
import { assembleKanjiPage, neighbourReferences, relatedGroupsForSubject, toWordExamples, type KanjiPageSources } from "./subjectPageModel";
import { WORD_EXAMPLE_LIMIT } from "@/app/shared/subject-page/SubjectPage.constants";

/**
 * A kanji page, assembled from whatever knows the character.
 *
 * The principle under test: the dictionary and JLPT sources are the root and
 * WaniKani is the bonus. A page must be complete without WaniKani and better
 * with it. If a kanji WaniKani has never heard of came out thin, the layering
 * would be the wrong way round - and four fifths of the dictionary is exactly
 * that kanji.
 */

function reference(overrides: Partial<CatalogRelatedReference> & { subjectId: number }): CatalogRelatedReference {
  return {
    label: "水",
    wkLevel: 2,
    reading: "すい",
    meaning: "Water",
    subjectType: SUBJECT_TYPES.kanji,
    characters: "水",
    slug: "水",
    ...overrides,
  };
}

function wanikani(overrides: Partial<CatalogSubjectDetail> = {}): CatalogSubjectDetail {
  return {
    subjectId: 479,
    subjectType: SUBJECT_TYPES.kanji,
    wkLevel: 2,
    characters: "水",
    meanings: ["Water"],
    readings: ["すい", "みず"],
    primaryReadings: ["すい"],
    radicals: [],
    visuallySimilar: [],
    usedInVocabulary: [],
    componentKanji: [],
    meaningExplanation: "",
    readingExplanation: "",
    jlptLevel: 5,
    jlptMeta: null,
    ...overrides,
  };
}

const WORD_EXAMPLES = [
  {
    written: "水曜日",
    pronounced: "すいようび",
    gloss: "Wednesday",
    kanjiItems: [
      { subjectId: 479, label: "水", wkLevel: 2, reading: "すい", meaning: "Water" },
      { subjectId: 500, label: "曜", wkLevel: 5, reading: "よう", meaning: "Weekday" },
      { subjectId: 476, label: "日", wkLevel: 1, reading: "にち", meaning: "Sun" },
    ],
  },
  { written: "水泳", pronounced: "すいえい", gloss: "swimming" },
];

function sources(overrides: Partial<KanjiPageSources> = {}): KanjiPageSources {
  return { character: "水", grade: null, dictionary: null, jlpt: null, wanikani: null, ...overrides };
}

describe("a kanji WaniKani has never taught", () => {
  const page = assembleKanjiPage(
    sources({ jlpt: { nLevel: 5, heisigKeyword: "water", wordExamples: WORD_EXAMPLES } }),
  );

  /* The headline requirement, and it must not depend on WaniKani at all. */
  it("still lists the words it appears in", () => {
    expect(page.words.map((word) => word.written)).toEqual(["水曜日", "水泳"]);
    expect(page.words[0]!.gloss).toBe("Wednesday");
  });

  it("still carries its JLPT level and Heisig keyword", () => {
    expect(page.jlptLevel).toBe(5);
    expect(page.heisigKeyword).toBe("water");
  });

  it("has nothing WaniKani-shaped, rather than something broken", () => {
    expect(page.related).toEqual([]);
    expect(page.mnemonics).toBeNull();
    expect(page.wkLevel).toBeNull();
  });
});

describe("a kanji WaniKani teaches", () => {
  const page = assembleKanjiPage(
    sources({
      jlpt: { nLevel: 5, heisigKeyword: "water", wordExamples: WORD_EXAMPLES },
      wanikani: wanikani({
        radicals: [reference({ subjectId: 8769, subjectType: SUBJECT_TYPES.radical, characters: null, slug: "leaf", label: "leaf", meaning: "Leaf", reading: null })],
        usedInVocabulary: [
          reference({ subjectId: 2551, subjectType: SUBJECT_TYPES.vocabulary, characters: "水泡", slug: "水泡", label: "水泡", meaning: "Foam", reading: "すいほう", wkLevel: 46 }),
          reference({ subjectId: 2600, subjectType: SUBJECT_TYPES.vocabulary, characters: "水泳", slug: "水泳", label: "水泳", meaning: "Swimming", reading: "すいえい", wkLevel: 10 }),
        ],
        visuallySimilar: [reference({ subjectId: 900, characters: "氷", slug: "氷", label: "氷", meaning: "Ice" })],
        meaningExplanation: "<p>Looks like water.</p>",
        readingExplanation: "",
      }),
    }),
  );

  it("keeps everything the dictionary layer gave it", () => {
    expect(page.words).toHaveLength(2);
    expect(page.jlptLevel).toBe(5);
  });

  it("adds the relations, in reading order, easiest first", () => {
    expect(page.related.map((group) => group.id)).toEqual([
      RELATED_GROUPS.builtFrom,
      RELATED_GROUPS.usedIn,
      RELATED_GROUPS.looksLike,
    ]);
    expect(page.related[1]!.items.map((item) => item.label)).toEqual(["水泳", "水泡"]);
  });

  /*
   * The trap: the same field holds kanji under a radical and words under a
   * kanji. Read wrong, a word ends up behind a kanji address that 404s.
   */
  it("sends each relation to the right kind of page", () => {
    const [builtFrom, usedIn, looksLike] = page.related;
    expect(builtFrom!.items[0]!.href).toBe("/radicals/leaf");
    expect(usedIn!.items[0]!.href).toBe(`/vocabulary/${encodeURIComponent("水泳")}`);
    expect(looksLike!.items[0]!.href).toBe(`/kanji/${encodeURIComponent("氷")}`);
  });

  it("strips the markup from the mnemonics and drops an empty one", () => {
    expect(page.mnemonics).toEqual({ meaning: "Looks like water.", reading: "" });
    expect(page.wkLevel).toBe(2);
  });
});

describe("the words a kanji appears in", () => {
  /*
   * Most JLPT example words are not WaniKani vocabulary, so linking the word
   * lands on "Nothing here by that name". The kanji inside it always resolve.
   */
  it("links the kanji inside a word, never the word", () => {
    const [wednesday] = toWordExamples(WORD_EXAMPLES, "水");
    expect(wednesday!.kanji.map((item) => item.href)).toEqual([
      `/kanji/${encodeURIComponent("曜")}`,
      `/kanji/${encodeURIComponent("日")}`,
    ]);
  });

  /* A link back to the page being read is a chip that does nothing. */
  it("leaves the page's own character out of the chips", () => {
    const [wednesday] = toWordExamples(WORD_EXAMPLES, "水");
    expect(wednesday!.kanji.map((item) => item.label)).not.toContain("水");
  });

  it("keeps a word with no kanji chips rather than dropping it", () => {
    const words = toWordExamples(WORD_EXAMPLES, "水");
    expect(words[1]).toEqual({ written: "水泳", pronounced: "すいえい", gloss: "swimming", kanji: [] });
  });

  /* 一 appears in hundreds of words; all of them is a page nobody scrolls. */
  it("stops at a length that still reads as a list", () => {
    const many = Array.from({ length: WORD_EXAMPLE_LIMIT + 10 }, (_, index) => ({
      written: `一${index}`,
      pronounced: "いち",
      gloss: "one",
    }));
    expect(toWordExamples(many, "一")).toHaveLength(WORD_EXAMPLE_LIMIT);
  });

  it("reads nothing into a column that holds nothing", () => {
    expect(toWordExamples(null, "水")).toEqual([]);
    expect(toWordExamples("not an array", "水")).toEqual([]);
  });
});

describe("a subject's relations on the other two pages", () => {
  it("lists a word's kanji as what it is built from", () => {
    const groups = relatedGroupsForSubject(
      wanikani({
        subjectId: 2551,
        subjectType: SUBJECT_TYPES.vocabulary,
        characters: "水泡",
        componentKanji: [reference({ subjectId: 479 }), reference({ subjectId: 900, characters: "泡", slug: "泡", label: "泡", meaning: "Bubbles" })],
      }),
    );
    expect(groups.map((group) => group.id)).toEqual([RELATED_GROUPS.builtFrom]);
    expect(groups[0]!.items.map((item) => item.href)).toEqual([
      `/kanji/${encodeURIComponent("水")}`,
      `/kanji/${encodeURIComponent("泡")}`,
    ]);
  });

  it("lists a radical's kanji as what it is used in", () => {
    const groups = relatedGroupsForSubject(
      wanikani({
        subjectId: 8769,
        subjectType: SUBJECT_TYPES.radical,
        characters: "leaf",
        usedInVocabulary: [reference({ subjectId: 479 })],
      }),
    );
    expect(groups.map((group) => group.id)).toEqual([RELATED_GROUPS.usedIn]);
    expect(groups[0]!.items[0]!.href).toBe(`/kanji/${encodeURIComponent("水")}`);
  });
});

describe("a word's neighbourhood", () => {
  const water = reference({ subjectId: 479 });
  const bubbles = reference({ subjectId: 900, characters: "泡", slug: "泡", label: "泡", meaning: "Bubbles" });
  const word = (subjectId: number, characters: string, wkLevel: number) =>
    reference({ subjectId, characters, slug: characters, label: characters, wkLevel, subjectType: SUBJECT_TYPES.vocabulary });
  const foam = word(2551, "水泡", 46);
  const wednesday = word(2600, "水曜日", 2);
  const swimming = word(2700, "水泳", 12);
  const soapBubble = word(2800, "泡", 30);

  /* 水's words and 泡's words, with 水泡 in both lists, gathered once each. */
  it("gathers each kanji's words once, in the order the kanji are written", () => {
    const gathered = neighbourReferences([
      wanikani({ subjectId: 479, usedInVocabulary: [wednesday, foam, swimming] }),
      wanikani({ subjectId: 900, characters: "泡", usedInVocabulary: [foam, soapBubble] }),
    ]);
    expect(gathered.map((item) => item.subjectId)).toEqual([2600, 2551, 2700, 2800]);
  });

  /* The bug: a word page listed its kanji and stopped. */
  it("gives a word page the other words built from its kanji, easiest first", () => {
    const groups = relatedGroupsForSubject(
      wanikani({ subjectId: 2551, subjectType: SUBJECT_TYPES.vocabulary, characters: "水泡", componentKanji: [water, bubbles] }),
      [wednesday, foam, swimming, soapBubble],
    );
    expect(groups.map((group) => group.id)).toEqual([RELATED_GROUPS.builtFrom, RELATED_GROUPS.sharesKanji]);
    const shares = groups[1]!;
    /* Itself is not one of its own neighbours. */
    expect(shares.items.map((item) => item.label)).toEqual(["水曜日", "水泳", "泡"]);
    expect(shares.items[0]!.href).toBe(`/vocabulary/${encodeURIComponent("水曜日")}`);
  });

  it("shows nothing for a word with no kanji, rather than an empty heading", () => {
    const groups = relatedGroupsForSubject(
      wanikani({ subjectId: 3000, subjectType: SUBJECT_TYPES.vocabulary, characters: "ありがとう", componentKanji: [] }),
      [],
    );
    expect(groups).toEqual([]);
  });
});

/* Referenced so the bucket import is not flagged; the model never touches SRS. */
void SRS_BUCKETS;
