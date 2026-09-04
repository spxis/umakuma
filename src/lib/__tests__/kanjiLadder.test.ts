import { describe, expect, it } from "vitest";

import ladderData from "@/data/kanjiLadder.json";
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
  optionalRadicalLevel,
  radicalLevel,
  radicalsOfferedAtLevel,
  radicalsAtLevel,
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

  it("keeps levels light enough to clear, and empty of kanji only at the start", () => {
    const sizes = kanjiLadderLevels().map((entry) => entry.kanji.length);
    expect(sizes).toHaveLength(KANJI_LADDER_LEVELS);
    /* A level gates on its kanji reaching Guru, so the whole point is that it
       stays well under WaniKani's 35 even at its heaviest. */
    expect(Math.max(...sizes)).toBeLessThan(30);

    /*
     * Level 1 teaches radicals and kana words and no kanji at all, which is
     * what makes "a radical is taught before its kanji" true rather than
     * nearly true: `placeRadicals` clamps at level 1, so a kanji there would
     * force its own radicals into the same level. Every level after it has
     * kanji.
     */
    expect(sizes[0]).toBe(0);
    expect(Math.min(...sizes.slice(1))).toBeGreaterThan(0);
  });

  /*
   * The rule the ladder exists to keep. It was quietly broken for all six of
   * level 1's kanji before they moved to level 2 — 年 alone is built from four
   * radicals that were being taught alongside it.
   */
  it("teaches every radical strictly before any kanji built from it", () => {
    const radicals = JSON.parse(
      readFileSync(join(process.cwd(), "src/data/radicals/index.json"), "utf8"),
    ) as { radicals: { radical: string; kanji: string }[] };

    const offenders: string[] = [];
    let checked = 0;
    for (const entry of radicals.radicals) {
      const partLevel = radicalLevel(entry.radical);
      if (partLevel === null) continue;
      for (const kanji of entry.kanji) {
        const level = kanjiPlacement(kanji)?.level;
        if (level === undefined) continue;
        checked += 1;
        if (partLevel >= level) offenders.push(`${entry.radical} (L${partLevel}) -> ${kanji} (L${level})`);
      }
    }
    expect(checked).toBeGreaterThan(8_000);
    expect(offenders).toEqual([]);
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

  /*
   * The JLPT covers 2,211 characters and we teach 2,235, so 227 have no N
   * level. Sweeping all of them into the last band was right for the secondary
   * and name kanji and badly wrong for fourteen: 分 is the 24th commonest
   * character in Japanese, taught in Japanese schools at grade 2, and it sat
   * at level 91 because an exam does not list it. Absence from one syllabus is
   * not evidence of difficulty.
   */
  it("teaches a grade-school kanji early even when the JLPT never mentions it", () => {
    const grades = kanjiLevels as Record<string, { schoolGrade: number }>;
    const stranded: string[] = [];

    for (const [kanji, grade] of Object.entries(grades)) {
      if (grade.schoolGrade > 6) continue;
      const placement = kanjiPlacement(kanji);
      /* Only the ones the JLPT skips; the rest are already banded by it. */
      if (!placement || placement.nLevel !== null) continue;
      if (placement.level > 50) stranded.push(`${kanji} (grade ${grade.schoolGrade}, L${placement.level})`);
    }

    expect(stranded).toEqual([]);
    /* 分 in particular, because it is the one that made this visible. */
    expect(kanjiPlacement("分")?.level).toBeLessThanOrEqual(20);
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

describe("radical placement", () => {
  /* RADKFILE's decomposition, the set behind dictionary radical lookup. It is
     already in the repo under CC BY-SA 4.0; WaniKani's 491 are their own
     invention and are not used here. */
  const radicals = (
    JSON.parse(readFileSync(join(process.cwd(), "src/data/radicals/index.json"), "utf8")) as {
      radicals: Array<{ radical: string; kanji: string }>;
    }
  ).radicals;

  it("never teaches a kanji before a radical it is built from", () => {
    const late: string[] = [];
    for (const entry of radicals) {
      const introduced = radicalLevel(entry.radical);
      for (const kanji of entry.kanji) {
        const placement = kanjiPlacement(kanji);
        if (placement === null) continue;
        /* The radical has to be there first, or the kanji arrives carrying a
           piece the member has never seen. */
        if (introduced === null || introduced > placement.level) {
          late.push(`${kanji} @${placement.level} needs ${entry.radical}`);
        }
      }
    }
    expect(late).toEqual([]);
  });

  it("introduces a radical ahead of the kanji built from it", () => {
    const LEAD = 2;
    for (const entry of radicals) {
      const levels = [...entry.kanji]
        .map((kanji) => kanjiPlacement(kanji)?.level)
        .filter((level): level is number => level !== undefined);
      if (levels.length === 0) {
        expect(radicalLevel(entry.radical)).toBeNull();
        continue;
      }
      /* Early enough to be familiar, not so early it is stranded from the
         kanji that gives it a point. Level 1 has nothing before it. */
      expect(radicalLevel(entry.radical)).toBe(Math.max(1, Math.min(...levels) - LEAD));
    }
  });

  it("orders parts before wholes inside a band", () => {
    /* A radical that is also a kanji reads better taught first — 言 before 語.
       Only within a band, though: across bands the member has the radical
       already, and forcing the kanji too would drag N1 into level 1.
       Compared on the teaching band rather than the JLPT level, because that
       is the one that decided the placement — 無 is taught in the N4 band on
       its school year while 乞 sits in the last band, and neither constrains
       the other. */
    const wrong: string[] = [];
    for (const entry of radicals) {
      const part = kanjiPlacement(entry.radical);
      if (part === null) continue;
      for (const kanji of entry.kanji) {
        if (kanji === entry.radical) continue;
        const whole = kanjiPlacement(kanji);
        if (whole === null || whole.teachingBand !== part.teachingBand) continue;
        if (part.level > whole.level) wrong.push(`${kanji}@${whole.level} before ${entry.radical}@${part.level}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("skips only radicals no kanji we teach contains", () => {
    const placed = radicals.filter((entry) => radicalLevel(entry.radical) !== null);
    expect(placed.length).toBeGreaterThan(230);
    expect(placed.length).toBeLessThanOrEqual(radicals.length);
  });

  it("counts each level's radicals", () => {
    for (const entry of kanjiLadderLevels()) {
      expect(radicalsAtLevel(entry.level)).toHaveLength(entry.radicals);
    }
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
    const firstTen = levels.slice(0, 10).map(
      (entry) => entry.kanji.length + entry.vocabulary + entry.radicals,
    );
    /* WaniKani's level 1 alone is 80 subjects and their heaviest is 213. */
    expect(Math.max(...firstTen)).toBeLessThan(70);
    /* Level 1 carries the radical lead — 22 radicals, six kanji, 18 words.
       WaniKani's is 25 radicals, 18 kanji and 37 words, for 80. */
    expect(firstTen[0]).toBeLessThanOrEqual(50);
    const everyLevel = levels.map(
      (entry) => entry.kanji.length + entry.vocabulary + entry.radicals,
    );
    expect(Math.max(...everyLevel)).toBeLessThan(120);
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
    const totals = kanjiLadderLevels().map(
      (entry) => entry.kanji.length + entry.vocabulary + entry.radicals,
    );
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

/**
 * RADKFILE has 253 classical radicals and only 241 are needed: 无, 曰, 韭, 鬥,
 * 鹵, 黍, 黹, 鼠, 鼎, 黽, 齊 and 龠 appear in no jōyō character. Dropping them
 * left the set incomplete for anybody who wanted all of it, and left forty
 * later levels teaching no radical while the first twenty carried a dozen each.
 */
describe("the radicals nothing needs", () => {
  it("offers all twelve, one per level, at the end of the ladder", () => {
    const offered = Object.entries(
      (ladderData as { optionalRadicalLevel: Record<string, number> }).optionalRadicalLevel,
    );
    expect(offered).toHaveLength(12);

    const levels = offered.map(([, level]) => level).sort((left, right) => left - right);
    /* One each, consecutive, finishing on the last level. */
    expect(new Set(levels).size).toBe(levels.length);
    expect(levels[levels.length - 1]).toBe(KANJI_LADDER_LEVELS);
    expect(levels[0]).toBe(KANJI_LADDER_LEVELS - 11);

    for (const [radical] of offered) {
      expect(optionalRadicalLevel(radical)).not.toBeNull();
      /* Offered is not taught: nothing a member learns is built from these. */
      expect(radicalLevel(radical)).toBeNull();
    }
  });

  it("accounts for every one of RADKFILE's radicals", () => {
    const required = Object.keys((ladderData as { radicalLevel: Record<string, number> }).radicalLevel);
    const optional = Object.keys(
      (ladderData as { optionalRadicalLevel: Record<string, number> }).optionalRadicalLevel,
    );
    const all = JSON.parse(
      readFileSync(join(process.cwd(), "src/data/radicals/index.json"), "utf8"),
    ) as { radicals: { radical: string }[] };
    expect(required.length + optional.length).toBe(all.radicals.length);
    expect(new Set([...required, ...optional]).size).toBe(all.radicals.length);
  });

  it("marks which is which when a level is asked what it offers", () => {
    const last = radicalsOfferedAtLevel(KANJI_LADDER_LEVELS);
    expect(last.some((entry) => entry.radical === "龠" && entry.optional)).toBe(true);
    expect(radicalsOfferedAtLevel(1).every((entry) => !entry.optional)).toBe(true);
  });
});
