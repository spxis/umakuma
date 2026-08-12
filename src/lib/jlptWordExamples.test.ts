import { describe, expect, it } from "vitest";

import {
  enrichWordExamplesWithKanji,
  kanjiCharacters,
  parseJlptWordExamples,
} from "@/lib/jlptWordExamples";

describe("JLPT word-example enrichment", () => {
  it("extracts unique kanji while preserving written order", () => {
    expect(kanjiCharacters("取り扱い取る")).toEqual(["取", "扱"]);
  });

  it("adds WaniKani references and leaves unrecognized kanji out", () => {
    const [example] = enrichWordExamplesWithKanji(
      [{ written: "日本語", pronounced: "にほんご", gloss: "Japanese language" }],
      [
        {
          wkSubjectId: 440,
          level: 2,
          characters: "日",
          meanings: [{ meaning: "Sun", primary: true }],
          readings: [{ reading: "にち", primary: true }],
        },
        {
          wkSubjectId: 450,
          level: 3,
          characters: "本",
          meanings: [{ meaning: "Book", primary: true }],
          readings: [{ reading: "ほん", primary: true }],
        },
      ],
    );

    expect(example?.kanjiItems).toEqual([
      { subjectId: 440, label: "日", wkLevel: 2, reading: "にち", meaning: "Sun" },
      { subjectId: 450, label: "本", wkLevel: 3, reading: "ほん", meaning: "Book" },
    ]);
  });

  it("parses legacy and enriched rows defensively", () => {
    expect(parseJlptWordExamples([
      { written: "日本語", pronounced: "にほんご", gloss: "Japanese", kanjiItems: [
        { subjectId: 440, label: "日", wkLevel: 2, reading: "にち", meaning: "Sun" },
        { subjectId: "bad", label: "本", wkLevel: 3 },
      ] },
      { written: "学校", pronounced: "がっこう", gloss: "School" },
    ])).toEqual([
      {
        written: "日本語",
        pronounced: "にほんご",
        gloss: "Japanese",
        kanjiItems: [{ subjectId: 440, label: "日", wkLevel: 2, reading: "にち", meaning: "Sun" }],
      },
      { written: "学校", pronounced: "がっこう", gloss: "School" },
    ]);
  });
});