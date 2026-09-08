import { describe, expect, it } from "vitest";

import { withCustomStudyFacts } from "./customStudyFacts";

const meta = { primaryMeaning: "body", meanings: ["body"], onReadings: ["シン"], kunReadings: ["み"], nanoriReadings: [], wordExamples: null, strokeCount: 7, frequencyRank: 320, schoolGrade: 3, heisigKeyword: "somebody" };
type Item = { subjectId: number; subjectType: string; characters: string };
const item = (over: Partial<Item>): Item => ({ subjectId: 1, subjectType: "kanji", characters: "身", ...over });

describe("a library kanji, beyond what the member typed", () => {
  const facts = { jlpt: new Map([["身", { nLevel: 3, meta }]]), warnFor: (characters: string) => (characters === "身" ? [{ kanji: "射", meaning: "shoot", reading: "シャ", wkLevel: 20, unLevel: 20, ugLevel: null, standing: "ahead" as const }] : []) };

  it("puts the N band, the panel and the look-alikes on by character", () => {
    const [kanji] = withCustomStudyFacts([item({})], facts);
    expect(kanji!.jlptLevel).toBe(3);
    expect(kanji!.jlptMeta?.strokeCount).toBe(7);
    expect(kanji!.confusables?.map((warning) => warning.kanji)).toEqual(["射"]);
  });

  it("leaves a word or a radical alone, with the fields present and empty", () => {
    const [word] = withCustomStudyFacts([item({ subjectType: "vocabulary", characters: "身体" })], facts);
    expect(word).toMatchObject({ jlptLevel: null, jlptMeta: null, confusables: [] });
  });

  it("has nothing for a kanji the table does not hold", () => {
    const [unknown] = withCustomStudyFacts([item({ characters: "𠮷" })], facts);
    expect(unknown).toMatchObject({ jlptLevel: null, jlptMeta: null, confusables: [] });
  });
});
