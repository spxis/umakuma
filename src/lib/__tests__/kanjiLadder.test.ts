import { describe, expect, it } from "vitest";

import jlptReadings from "@/data/jlptReadings.json";
import kanjiLevels from "@/data/kanjiLevels.json";
import {
  KANJI_LADDER_LEVELS,
  KANJI_LADDER_TOTAL,
  isKanjiLadderLevel,
  jlptCompletedAt,
  kanjiLadderLevel,
  kanjiLadderLevels,
  kanjiLadderMilestones,
  kanjiPlacement,
  kanjiThrough,
  levelForJlpt,
  vocabularyLevel,
} from "../kanjiLadder";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import wkIndex from "@/data/wk-catalog-levels/index.json";
import wordFrequency from "@/data/wordFrequency.json";

const JOYO_CATEGORIES = ["elementary", "secondary"];
const NAME_KANJI_CATEGORY = "name_kanji";

type LevelEntry = { schoolGrade: number; category: { code: string } | null } | null;
const levelsByKanji = kanjiLevels as Record<string, LevelEntry>;

function kanjiInCategories(codes: string[]): string[] {
  return Object.entries(levelsByKanji)
    .filter(([, entry]) => entry?.category != null && codes.includes(entry.category.code))
    .map(([kanji]) => kanji);
}

const taught = new Set(kanjiLadderLevels().flatMap((entry) => entry.kanji));

describe("kanji ladder shape", () => {
  it("cuts every kanji into a level, with none lost or repeated", () => {
    const all = kanjiLadderLevels().flatMap((entry) => entry.kanji);
    expect(all).toHaveLength(KANJI_LADDER_TOTAL);
    expect(new Set(all).size).toBe(KANJI_LADDER_TOTAL);
  });

  it("keeps levels light enough to clear, and never empty", () => {
    const sizes = kanjiLadderLevels().map((entry) => entry.kanji.length);
    expect(sizes).toHaveLength(KANJI_LADDER_LEVELS);
    expect(Math.min(...sizes)).toBeGreaterThan(0);
    /* A level gates on its kanji reaching Guru, so the whole point is that it
       stays well under WaniKani's 35 even at its heaviest. */
    expect(Math.max(...sizes)).toBeLessThan(30);
  });

  it("starts gently so a beginner's first wins come quickly", () => {
    const sizes = kanjiLadderLevels().map((entry) => entry.kanji.length);
    /* WaniKani opens with 18 kanji and averages 35. Level 1 here is a fraction
       of that, and the first ten levels together stay under one WaniKani
       level's worth of kanji. */
    expect(sizes[0]).toBeLessThanOrEqual(8);
    expect(sizes.slice(0, 10).reduce((sum, size) => sum + size, 0)).toBeLessThan(100);
    /* And it ramps: later levels are never lighter than the opening ones. */
    expect(sizes[KANJI_LADDER_LEVELS - 1]).toBeGreaterThan(sizes[0]);
  });

  it("counts each level's WaniKani and added kanji", () => {
    for (const entry of kanjiLadderLevels()) {
      expect(entry.fromWaniKani + entry.added).toBe(entry.kanji.length);
    }
  });
});

describe("kanji ladder coverage", () => {
  it("teaches every joyo kanji", () => {
    const missing = kanjiInCategories(JOYO_CATEGORIES).filter((kanji) => !taught.has(kanji));
    expect(missing).toEqual([]);
  });

  it("teaches every JLPT kanji that is not a name kanji", () => {
    const jlpt = Object.keys(jlptReadings as Record<string, unknown>);
    const missing = jlpt.filter((kanji) => {
      if (taught.has(kanji)) return false;
      return levelsByKanji[kanji]?.category?.code !== NAME_KANJI_CATEGORY;
    });
    expect(missing).toEqual([]);
  });

  it("completes each JLPT level on its milestone level", () => {
    /* The promise the ladder makes: reach the milestone and you have every
       kanji of that JLPT level, with none of it left for later. */
    for (const milestone of kanjiLadderMilestones()) {
      const late = kanjiLadderLevels()
        .filter((entry) => entry.level > milestone.completeAtLevel)
        .flatMap((entry) => entry.kanji)
        .filter((kanji) => kanjiPlacement(kanji)?.nLevel === milestone.nLevel);
      expect(late).toEqual([]);
    }
  });

  it("puts the milestones on round, announceable levels", () => {
    expect(kanjiLadderMilestones().map((m) => [m.nLevel, m.completeAtLevel])).toEqual([
      [5, 10],
      [4, 20],
      [3, 35],
      [2, 50],
      [1, 100],
    ]);
  });

  it("leaves name kanji off the ladder, as a separate track", () => {
    const names = kanjiInCategories([NAME_KANJI_CATEGORY]);
    expect(names.filter((kanji) => taught.has(kanji)).length).toBeLessThan(names.length);
  });
});

describe("vocabulary placement", () => {
  /* Loading all sixty level files is the only way to see every word's kanji. */
  const levelsDir = join(process.cwd(), "src/data/wk-catalog-levels");
  const vocabulary: Array<{ id: number; word: string }> = (wkIndex as { files: string[] }).files
    .flatMap((file) => {
      const level = JSON.parse(readFileSync(join(levelsDir, file), "utf8")) as {
        vocabulary?: Array<{ wkSubjectId: number; characters: string | null; hiddenAt: string | null }>;
      };
      return (level.vocabulary ?? [])
        .filter((s) => s.hiddenAt === null && typeof s.characters === "string")
        .map((s) => ({ id: s.wkSubjectId, word: s.characters as string }));
    });

  const isKanji = (character: string) => {
    const code = character.codePointAt(0) ?? 0;
    return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
  };

  it("never teaches a word before every kanji in it", () => {
    const early: string[] = [];
    for (const entry of vocabulary) {
      const level = vocabularyLevel(entry.id);
      if (level === null) continue;
      for (const character of [...entry.word].filter(isKanji)) {
        const placement = kanjiPlacement(character);
        /* A word we teach must have every one of its kanji already taught. */
        if (placement === null || placement.level > level) early.push(`${entry.word} @${level}`);
      }
    }
    expect(early).toEqual([]);
  });

  it("places all but the orphaned word", () => {
    const placed = vocabulary.filter((entry) => vocabularyLevel(entry.id) !== null);
    /* WaniKani retired the name kanji in this one word but kept the word. */
    expect(vocabulary.length - placed.length).toBe(1);
  });

  it("keeps the early levels light once words are counted", () => {
    const levels = kanjiLadderLevels();
    const firstTen = levels.slice(0, 10).map((entry) => entry.kanji.length + entry.vocabulary);
    /* WaniKani's level 1 alone is 80 subjects and their heaviest is 213. */
    expect(Math.max(...firstTen)).toBeLessThan(60);
    expect(firstTen[0]).toBeLessThan(30);
    const everyLevel = levels.map((entry) => entry.kanji.length + entry.vocabulary);
    expect(Math.max(...everyLevel)).toBeLessThanOrEqual(110);
  });

  it("gives every level words, right to the top of the ladder", () => {
    /* Words may be held back as long as we like, so the supply is rationed to
       last all hundred levels. Spending it early left the last five with
       nothing but kanji. */
    expect(kanjiLadderLevels().filter((entry) => entry.vocabulary === 0)).toEqual([]);
  });

  it("teaches the commonest words first", () => {
    const ranks = (wordFrequency as { rank: Record<string, number> }).rank;
    /* Words are ordered by JMdict's newspaper frequency, so the median word in
       an early level is markedly commoner than in a late one. */
    const medianRankFor = (from: number, to: number) => {
      const found = vocabulary
        .filter((entry) => {
          const level = vocabularyLevel(entry.id);
          return level !== null && level >= from && level <= to;
        })
        .map((entry) => ranks[String(entry.id)] ?? Number.MAX_SAFE_INTEGER)
        .sort((a, b) => a - b);
      return found[Math.floor(found.length / 2)];
    };
    expect(medianRankFor(1, 10)).toBeLessThan(medianRankFor(40, 60));
    expect(medianRankFor(40, 60)).toBeLessThan(medianRankFor(90, 100));
  });

  it("keeps the counting words early, since they are essential", () => {
    for (const word of ["一つ", "二つ", "三つ"]) {
      const entry = vocabulary.find((candidate) => candidate.word === word);
      expect(entry, `${word} should be taught`).toBeDefined();
      expect(vocabularyLevel(entry!.id)).toBeLessThanOrEqual(20);
    }
  });

  it("holds words back so late levels are no heavier than middle ones", () => {
    const totals = kanjiLadderLevels().map((entry) => entry.kanji.length + entry.vocabulary);
    const middle = totals.slice(40, 60);
    const top = totals.slice(-10);
    const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(Math.abs(average(top) - average(middle))).toBeLessThan(10);
  });
});

describe("kanji ladder lookups", () => {
  it("accepts only real level numbers", () => {
    expect(isKanjiLadderLevel(1)).toBe(true);
    expect(isKanjiLadderLevel(KANJI_LADDER_LEVELS)).toBe(true);
    expect(isKanjiLadderLevel(0)).toBe(false);
    expect(isKanjiLadderLevel(KANJI_LADDER_LEVELS + 1)).toBe(false);
    expect(isKanjiLadderLevel(1.5)).toBe(false);
  });

  it("places a kanji on the level that lists it", () => {
    const level = kanjiLadderLevel(7);
    expect(level).not.toBeNull();
    for (const kanji of level!.kanji) {
      expect(kanjiPlacement(kanji)?.level).toBe(7);
    }
  });

  it("returns nothing for a kanji outside the joyo set", () => {
    expect(kanjiPlacement("犇")).toBeNull();
    expect(kanjiLadderLevel(0)).toBeNull();
  });

  it("answers what a member is ready for", () => {
    expect(levelForJlpt(5)).toBe(10);
    expect(levelForJlpt(1)).toBe(KANJI_LADDER_LEVELS);
    expect(jlptCompletedAt(9)).toBeNull();
    expect(jlptCompletedAt(10)).toBe(5);
    expect(jlptCompletedAt(34)).toBe(4);
    expect(jlptCompletedAt(35)).toBe(3);
    expect(jlptCompletedAt(KANJI_LADDER_LEVELS)).toBe(1);
  });

  it("accumulates kanji through a level", () => {
    const throughOne = kanjiThrough(1);
    const throughTwo = kanjiThrough(2);
    expect(throughTwo.slice(0, throughOne.length)).toEqual(throughOne);
    expect(kanjiThrough(KANJI_LADDER_LEVELS)).toHaveLength(KANJI_LADDER_TOTAL);
    expect(kanjiThrough(0)).toEqual([]);
  });
});
