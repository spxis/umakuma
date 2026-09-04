/**
 * Builds the UmaKuma kanji ladder: every joyo kanji, ordered so that finishing
 * a level range means finishing a JLPT level, cut into levels light enough to
 * clear.
 *
 * Two things are wrong with WaniKani's ladder and both are fixed here.
 *
 * First, its levels are heavy and flat: 35 kanji from level 1, and a level only
 * ends when 90% of them reach Guru. A beginner's first win is a long way off.
 * Ours ramps — 6 kanji at level 1, easing up as the learner does.
 *
 * Second, WaniKani's order has nothing to do with the JLPT, so a member cannot
 * say what they are ready for. Here each JLPT level finishes on a round ladder
 * level: N5 at 10, N4 at 20, N3 at 35, N2 at 50, and the rest of joyo by 100.
 *
 * The order is our own, not theirs. It is a topological sort of the kanji
 * prerequisite graph — 語 after 口, 五 and 言 — taken from RADKFILE, which has
 * no cycles. Where several kanji are available at once, they are ranked by
 * JLPT band, then the order Japanese schools teach them, then how common the
 * kanji is in print, then how many strokes it takes. Every one of those is a
 * published, checkable measure; none of them is WaniKani's.
 *
 * A radical is not a kanji, which is what keeps this from fighting the bands.
 * 七 contains 乙, and 乙 is also an N1 kanji — but 七 only needs the *radical*
 * 乙, a shape with a meaning, not the kanji with its readings and vocabulary.
 * So the hard prerequisite is always radical-before-kanji, never
 * kanji-before-kanji. Between two kanji the relationship is a preference,
 * applied inside a band so parts come before wholes without ever dragging a
 * later band's kanji forward. Otherwise N5 swells from 79 kanji to 100 to drag
 * in components a learner does not need yet.
 *
 * Radicals are the other half of the same constraint, pointing the other way.
 * A kanji is built from radicals, so every radical must arrive before the first
 * kanji that uses it — a ceiling, where a word's kanji are a floor.
 *
 * They arrive RADICAL_LEAD_LEVELS early rather than in the same level, so the
 * piece is already familiar when the kanji built from it turns up instead of
 * being met the same morning. Level 1 absorbs the lead for everything needed
 * early, which is the right shape for it: 22 radicals, and the building blocks
 * come first.
 *
 * The radicals are RADKFILE's 253, not WaniKani's 491. WaniKani invents its own
 * set to hang mnemonics on — "gun", "leaf", "hat" — which are theirs and are
 * not a system anyone else uses. RADKFILE is the decomposition behind ordinary
 * dictionary radical lookup, and is already in the repo under CC BY-SA 4.0.
 *
 * Vocabulary follows the kanji. A word cannot be taught before every kanji in
 * it has been, so re-ordering the kanji moves the words too.
 *
 * That is a floor and nothing more: a word may be held back as long as we like.
 * Rationing words to the level that unlocks them spends them too fast — the
 * supply ran dry at level 95 and the last five levels had nothing but kanji.
 * So the whole 6,795 are spread across all 100 levels instead, light at the
 * start and flat thereafter, which is what keeps a level's total load down.
 *
 * Which words go first is then a question of usefulness, not of what happened
 * to unlock earliest — a learner should be meeting words worth knowing the
 * whole way up. They are ordered by JMdict's newspaper-corpus frequency; see
 * scripts/build-word-frequency.mjs.
 *
 * Reads only files, never the database, so it runs in CI without DATABASE_URL.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { applyLadderOps, parseLadderOverrides } from "../src/lib/ladder/ladderOps.mjs";

const WK_LEVELS_DIR = path.resolve("src/data/wk-catalog-levels");
const KANJIDIC_DIR = path.resolve("src/data/kanjidic");
const JLPT_READINGS_PATH = path.resolve("src/data/jlptReadings.json");
const WORD_FREQUENCY_PATH = path.resolve("src/data/wordFrequency.json");
const RADICALS_PATH = path.resolve("src/data/radicals/index.json");
const OVERRIDES_PATH = path.resolve("src/data/kanjiLadderOverrides.json");
const OUTPUT_PATH = path.resolve("src/data/kanjiLadder.json");

const LADDER_LEVELS = 100;
const JOYO_MAX_GRADE = 8;
/** Kanji on no JLPT list at all sort after N1, and share its band. */
const NO_JLPT_LEVEL = 0;
/**
 * Vocabulary is spread on its own curve, not pinned to each level's kanji: it
 * ramps up over the first VOCABULARY_RAMP_LEVELS from a fraction of the
 * eventual per-level share, then holds flat to the top of the ladder.
 */
/** How far ahead of its first kanji a radical is introduced. */
const RADICAL_LEAD_LEVELS = 2;

/**
 * Kanji start at level 2, so level 1 is radicals alone.
 *
 * The rule is that a radical is taught before the kanji built from it, and
 * that was quietly untrue at the top of the ladder: `placeRadicals` puts a
 * radical `RADICAL_LEAD_LEVELS` before its first kanji and clamps at 1, so
 * every kanji at level 1 got its radicals in the same level as itself. All six
 * of them did, 年 with four radicals among them.
 *
 * There is nowhere below level 1, so the fix is to leave it empty of kanji. A
 * first level of twenty-two shapes with no readings to memorise is also the
 * gentlest possible opening, and it gates on its radicals reaching Guru the
 * way every other level gates on its kanji.
 */
const KANJI_START_LEVEL = 2;
/*
 * How many levels the word share takes to reach full.
 *
 * Was 20, which spent the early supply too fast: levels 14-18 teach kanji that
 * unlock few words, and with nothing banked level 16 came up eleven words short
 * of its target while 17 and 18 overshot repaying it. Twenty-six holds enough
 * back to ride through that stretch — the worst dip on the whole ladder falls
 * from eleven subjects to six, and the number of levels lighter than the one
 * before them falls from forty to twenty-nine.
 */
const VOCABULARY_RAMP_LEVELS = 26;
const VOCABULARY_START_SHARE = 0.25;
const CJK_RANGES = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
];

/**
 * Each JLPT level completes on a round ladder level. `shape` is the relative
 * size of the band's first and last level; it only sets the curve, since the
 * band's kanji count fixes the average. Early bands ramp so a beginner clears
 * levels quickly; later bands sit flat.
 */
const JLPT_BANDS = [
  { nLevel: 5, throughLevel: 10, shape: [6, 10] },
  { nLevel: 4, throughLevel: 20, shape: [11, 22] },
  { nLevel: 3, throughLevel: 35, shape: [1, 1] },
  { nLevel: 2, throughLevel: 50, shape: [1, 1] },
  { nLevel: 1, throughLevel: LADDER_LEVELS, shape: [1, 1] },
];

/** Kanji on no JLPT list sort with N1, at the end. */
const BAND_ORDER = [5, 4, 3, 2, 1];

/**
 * Which band a kanji is *taught* in when the JLPT has never heard of it.
 *
 * The JLPT covers 2,211 characters and we teach 2,235, so 227 have no N level
 * at all — and they were all being swept into the final band, which is levels
 * 51-100. That is right for the 158 secondary-school characters and the 33
 * name kanji among them. It was badly wrong for fourteen: 分 is the
 * twenty-fourth commonest character in Japanese, is taught in Japanese schools
 * at grade 2, and WaniKani teaches it at level 3 — and it was sitting at UK91
 * for no better reason than that an exam does not list it.
 *
 * So a kanji with no JLPT level falls back to the year Japan teaches it in.
 * Absence from one syllabus is not evidence of difficulty.
 */
const GRADE_TO_BAND = new Map([
  [1, 5],
  [2, 5],
  [3, 4],
  [4, 4],
  [5, 3],
  [6, 3],
]);

/** Reads WaniKani's kanji in teaching order: level, then their own subject id. */
async function loadWaniKaniOrder() {
  const index = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, "index.json"), "utf8"));
  const ordered = [];
  for (const file of index.files) {
    const level = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, file), "utf8"));
    const kanji = (level.kanji ?? [])
      .filter((s) => s.hiddenAt === null && typeof s.characters === "string")
      .sort((a, b) => a.wkSubjectId - b.wkSubjectId);
    for (const s of kanji) ordered.push({ kanji: s.characters, waniKaniLevel: level.level });
  }
  return ordered;
}

/**
 * Which kanji should come before which, within a band. A component that is also
 * a kanji we teach reads better taught first — 言 before 語 — so where both sit
 * in the same JLPT band the part is ordered ahead of the whole.
 *
 * Deliberately not applied across bands: the member gets the *radical* before
 * any kanji built on it regardless, and that is the only real prerequisite.
 * Treating it as one across bands drags N1 kanji into level 1 for no gain.
 */
export function kanjiPrerequisites(radicals, taught, sameBand) {
  const needs = new Map([...taught].map((kanji) => [kanji, new Set()]));
  for (const entry of radicals) {
    if (!taught.has(entry.radical)) continue;
    for (const kanji of entry.kanji) {
      if (kanji === entry.radical || !taught.has(kanji)) continue;
      if (sameBand(kanji, entry.radical)) needs.get(kanji).add(entry.radical);
    }
  }
  return needs;
}

/**
 * Lifts every kanji's priority to that of the most urgent kanji needing it.
 *
 * Without this the sort deadlocks in slow motion: 七 is N5 but contains 乙,
 * which is N1, so 七 waits behind every N4, N3 and N2 kanji and "N5" ends up
 * 1,922 kanji long. A part is exactly as urgent as the soonest thing built
 * from it, so urgency propagates backwards along the graph.
 */
export function liftPriorities(taught, needs, priority) {
  const dependents = new Map([...taught].map((kanji) => [kanji, []]));
  for (const [kanji, required] of needs) {
    for (const dep of required) dependents.get(dep)?.push(kanji);
  }
  const lifted = new Map();
  const lower = (left, right) => {
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] < right[index] ? left : right;
    }
    return left;
  };
  const resolve = (kanji, seen) => {
    const cached = lifted.get(kanji);
    if (cached) return cached;
    /* Guard against a cycle the graph should not contain. */
    if (seen.has(kanji)) return priority(kanji);
    seen.add(kanji);
    let best = priority(kanji);
    for (const dependent of dependents.get(kanji) ?? []) {
      best = lower(best, resolve(dependent, seen));
    }
    seen.delete(kanji);
    lifted.set(kanji, best);
    return best;
  };
  for (const kanji of taught) resolve(kanji, new Set());
  return lifted;
}

/**
 * Orders the kanji: a topological sort of the prerequisite graph where, among
 * everything currently available, the next one is chosen by `priority`. So the
 * sequence is always legal, and within that, always the most useful next kanji.
 */
export function orderKanji(taught, needs, priority) {
  const remaining = new Set(taught);
  const met = new Set();
  const order = [];
  while (remaining.size > 0) {
    const available = [...remaining].filter((kanji) =>
      [...(needs.get(kanji) ?? [])].every((dep) => met.has(dep) || !remaining.has(dep)),
    );
    /* Nothing available means a cycle; take the best remaining so a bad graph
       degrades instead of hanging. */
    const pool = available.length > 0 ? available : [...remaining];
    pool.sort((a, b) => {
      const left = priority(a);
      const right = priority(b);
      for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return left[index] - right[index];
      }
      return a.localeCompare(b);
    });
    const next = pool[0];
    order.push(next);
    remaining.delete(next);
    met.add(next);
  }
  return order;
}

/** RADKFILE's radicals: each one and the kanji it appears in. */
async function loadRadicals() {
  const data = JSON.parse(await fs.readFile(RADICALS_PATH, "utf8"));
  return data.radicals.map((entry) => ({
    radical: entry.radical,
    strokes: entry.strokes,
    kanji: new Set([...entry.kanji]),
  }));
}

/**
 * Puts each radical a couple of levels ahead of the first kanji built from it.
 * It cannot go later — the kanji would arrive carrying a piece never seen — and
 * a lead means the piece is already familiar rather than brand new on the day.
 * Level 1 has nothing before it, so it takes whatever the lead pushes back.
 */
export function placeRadicals(radicals, levelOfKanji, lead = RADICAL_LEAD_LEVELS) {
  const level = new Map();
  for (const entry of radicals) {
    let earliest = Number.MAX_SAFE_INTEGER;
    for (const kanji of entry.kanji) {
      const kanjiLevel = levelOfKanji.get(kanji);
      if (kanjiLevel !== undefined && kanjiLevel < earliest) earliest = kanjiLevel;
    }
    if (earliest !== Number.MAX_SAFE_INTEGER) level.set(entry.radical, Math.max(1, earliest - lead));
  }
  const unused = radicals.filter((entry) => !level.has(entry.radical)).map((entry) => entry.radical);
  return { level, unused };
}

/** WaniKani's vocabulary, with the level each word was taught at. */
async function loadWaniKaniVocabulary() {
  const index = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, "index.json"), "utf8"));
  const words = [];
  for (const file of index.files) {
    const level = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, file), "utf8"));
    for (const s of level.vocabulary ?? []) {
      if (s.hiddenAt === null && typeof s.characters === "string") {
        words.push({ id: s.wkSubjectId, word: s.characters, waniKaniLevel: level.level });
      }
    }
  }
  return words;
}

function isKanjiCharacter(character) {
  const code = character.codePointAt(0);
  return CJK_RANGES.some(([low, high]) => code >= low && code <= high);
}

/**
 * How many words each level should teach: a gentle ramp, then flat. Returned as
 * a running total, which is what the placement actually needs.
 */
export function vocabularyTargets(total, levelCount) {
  const weights = [];
  for (let index = 0; index < levelCount; index += 1) {
    const progress = Math.min(1, index / Math.max(1, VOCABULARY_RAMP_LEVELS - 1));
    weights.push(VOCABULARY_START_SHARE + (1 - VOCABULARY_START_SHARE) * progress);
  }
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const running = [];
  let carried = 0;
  for (const weight of weights) {
    carried += (weight / weightSum) * total;
    running.push(carried);
  }
  return running;
}

/**
 * Places each word at or after the level that teaches its last kanji, holding
 * the rest back so the supply lasts the whole ladder. A level teaches its
 * target share unless the kanji have not been taught yet, in which case it
 * teaches everything unlocked and the target catches up later.
 * Longest-waiting words go first, then WaniKani's own order.
 */
export function placeVocabulary(words, levelOfKanji, kanjiPerLevel, rankOfWord = () => 0) {
  const queuedAt = new Map();
  const unplaceable = [];
  for (const entry of words) {
    const levels = [...entry.word].filter(isKanjiCharacter).map((c) => levelOfKanji.get(c));
    if (levels.some((level) => level === undefined)) {
      unplaceable.push(entry);
      continue;
    }
    const floor = levels.length === 0 ? 1 : Math.max(...levels);
    if (!queuedAt.has(floor)) queuedAt.set(floor, []);
    queuedAt.get(floor).push({ ...entry, floor });
  }

  const levelCount = kanjiPerLevel.length;
  const placeable = words.length - unplaceable.length;
  const targets = vocabularyTargets(placeable, levelCount);

  const placed = [];
  const waiting = [];
  let placedSoFar = 0;
  for (let level = 1; level <= levelCount; level += 1) {
    waiting.push(...(queuedAt.get(level) ?? []));
    /* Commonest first, so every level teaches words worth knowing. Frequency
       keeps the counting words early on its own — 一つ and 二つ are common
       words, not just teaching scaffolding. */
    waiting.sort((a, b) => rankOfWord(a.id) - rankOfWord(b.id) || a.waniKaniLevel - b.waniKaniLevel || a.id - b.id);
    /* Never more than the running target, never more than has been unlocked. */
    const wanted = Math.round(targets[level - 1]) - placedSoFar;
    const take = level === levelCount ? waiting.length : Math.max(0, Math.min(wanted, waiting.length));
    placed.push(waiting.splice(0, take));
    placedSoFar += take;
  }
  return { placed, unplaceable };
}

/** Grade and print-frequency for every kanji KANJIDIC2 knows. */
async function loadDictionary() {
  const files = (await fs.readdir(KANJIDIC_DIR)).filter((f) => f.startsWith("kanjidic-"));
  const entries = new Map();
  for (const file of files) {
    const data = JSON.parse(await fs.readFile(path.join(KANJIDIC_DIR, file), "utf8"));
    for (const e of data.kanji) entries.set(e.kanji, e);
  }
  return entries;
}

/**
 * Hands out `total` items across `count` levels along a straight ramp from
 * `from` to `to`. The ramp is a shape only: it is scaled so the sizes add up to
 * exactly `total`, with leftovers going to the largest fractional parts.
 */
export function rampedSizes(total, count, [from, to]) {
  if (count <= 0) return [];
  const weights = [];
  for (let index = 0; index < count; index += 1) {
    const progress = count === 1 ? 1 : index / (count - 1);
    weights.push(from + (to - from) * progress);
  }
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => (weight / weightSum) * total);
  const sizes = exact.map((value) => Math.floor(value));
  let remaining = total - sizes.reduce((sum, size) => sum + size, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const entry of order) {
    if (remaining <= 0) break;
    sizes[entry.index] += 1;
    remaining -= 1;
  }
  return sizes;
}

async function main() {
  const waniKani = await loadWaniKaniOrder();
  const dictionary = await loadDictionary();
  const jlpt = JSON.parse(await fs.readFile(JLPT_READINGS_PATH, "utf8"));
  const taught = new Set(waniKani.map((entry) => entry.kanji));

  const missing = [...dictionary.values()].filter(
    (e) => e.grade !== null && e.grade <= JOYO_MAX_GRADE && !taught.has(e.kanji),
  );
  /* Everything we teach: WaniKani's kanji plus the joyo it skips. */
  const everything = [...waniKani.map((e) => e.kanji), ...missing.map((e) => e.kanji)];
  /* What the JLPT says, which is what a milestone is measured against. */
  const nLevelOf = (kanji) => jlpt[kanji]?.nLevel ?? NO_JLPT_LEVEL;

  /*
   * Where a kanji is taught, which is not the same question. A character the
   * JLPT skips still has a school year, and that year is a better guide to
   * when a learner meets it than the fact of the omission.
   */
  const teachingBandOf = (kanji) => {
    const n = nLevelOf(kanji);
    if (n !== NO_JLPT_LEVEL) return n;
    return GRADE_TO_BAND.get(entryFor(kanji)?.grade) ?? NO_JLPT_LEVEL;
  };

  const bandRank = (kanji) => {
    const index = BAND_ORDER.indexOf(teachingBandOf(kanji));
    return index === -1 ? BAND_ORDER.length : index;
  };
  const entryFor = (kanji) => dictionary.get(kanji);

  /* Among the kanji available now, take the one a learner needs soonest:
     the JLPT level it belongs to, then the school year Japan teaches it in,
     then how common it is in print, then how many strokes it costs. */
  const priority = (kanji) => {
    const entry = entryFor(kanji);
    return [
      bandRank(kanji),
      entry?.grade ?? 9,
      entry?.frequencyRank ?? 9_999,
      entry?.strokeCount ?? 30,
    ];
  };

  const radicals = await loadRadicals();
  const everyKanji = new Set(everything);
  const needs = kanjiPrerequisites(radicals, everyKanji, (a, b) => bandRank(a) === bandRank(b));
  const lifted = liftPriorities(everyKanji, needs, priority);
  const sequence = orderKanji(everyKanji, needs, (kanji) => lifted.get(kanji) ?? priority(kanji));

  /* A band is finished at the point its last kanji appears. Prerequisites drag
     some kanji in ahead of their own band, so these are not the band sizes. */
  const positionOf = new Map(sequence.map((kanji, index) => [kanji, index]));
  let levels = [];
  /* Level 1 teaches radicals only; the bands allocate kanji from level 2. */
  let previousThrough = KANJI_START_LEVEL - 1;
  let previousIndex = 0;
  for (const band of JLPT_BANDS) {
    const isFinalBand = band.throughLevel === LADDER_LEVELS;
    const members = sequence.filter((kanji) => {
      const n = teachingBandOf(kanji);
      return isFinalBand ? n === band.nLevel || n === NO_JLPT_LEVEL : n === band.nLevel;
    });
    const finishesAt = isFinalBand
      ? sequence.length - 1
      : Math.max(...members.map((kanji) => positionOf.get(kanji)));
    const slice = sequence.slice(previousIndex, finishesAt + 1);
    const span = band.throughLevel - previousThrough;
    const sizes = rampedSizes(slice.length, span, band.shape);
    let at = 0;
    sizes.forEach((size, offset) => {
      levels.push({
        level: previousThrough + offset + 1,
        nLevel: band.nLevel,
        kanji: slice.slice(at, at + size),
      });
      at += size;
    });
    previousThrough = band.throughLevel;
    previousIndex = finishesAt + 1;
  }

  levels.unshift({ level: 1, nLevel: JLPT_BANDS[0].nLevel, kanji: [] });

  /*
   * An admin's moves, replayed over the computed ladder.
   *
   * Here and not earlier: the sort has run, so the levels exist to move
   * between; and not later, because `placeRadicals` and `placeVocabulary` are
   * pure functions of where the kanji ended up — a kanji moved now drags its
   * radicals and the words that use it along without that rule being written
   * a second time.
   */
  const overrides = parseLadderOverrides(await fs.readFile(OVERRIDES_PATH, "utf8").catch(() => ""));
  const applied = applyLadderOps(levels, overrides);
  if (applied.refused.length > 0) {
    console.error(`Refused ${applied.refused.length} of ${overrides.length} overrides:`);
    for (const refusal of applied.refused) console.error(`  ${refusal.key} (${refusal.id}) — ${refusal.reason}`);
    console.error("Fix or withdraw them; the ladder has not been written.");
    process.exit(1);
  }
  levels = applied.levels;

  const levelOfKanji = new Map(levels.flatMap((l) => l.kanji.map((k) => [k, l.level])));
  const { level: radicalLevel, unused } = placeRadicals(radicals, levelOfKanji);
  const vocabulary = await loadWaniKaniVocabulary();
  const frequency = JSON.parse(await fs.readFile(WORD_FREQUENCY_PATH, "utf8"));
  const { placed, unplaceable } = placeVocabulary(
    vocabulary,
    levelOfKanji,
    levels.map((l) => l.kanji.length),
    (id) => frequency.rank[id] ?? Number.MAX_SAFE_INTEGER,
  );

  const added = new Set(missing.map((entry) => entry.kanji));
  const wkLevelOf = new Map(waniKani.map((entry) => [entry.kanji, entry.waniKaniLevel]));
  const ladder = levels.map((entry, index) => ({
    ...entry,
    fromWaniKani: entry.kanji.filter((k) => !added.has(k)).length,
    added: entry.kanji.filter((k) => added.has(k)).length,
    vocabulary: placed[index].length,
    radicals: [...radicalLevel.values()].filter((level) => level === entry.level).length,
  }));

  const milestones = JLPT_BANDS.map((band) => ({
    nLevel: band.nLevel,
    completeAtLevel: band.throughLevel,
    kanji: ladder.filter((l) => l.nLevel === band.nLevel).reduce((sum, l) => sum + l.kanji.length, 0),
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    levels: LADDER_LEVELS,
    totalKanji: everything.length,
    source: { waniKani: waniKani.length, addedJoyo: missing.length },
    overrides: { applied: overrides.length, lastOpAt: overrides.at(-1)?.at ?? null },
    milestones,
    radicalLevel: Object.fromEntries(radicalLevel),
    vocabularyLevel: Object.fromEntries(
      placed.flatMap((words, index) => words.map((w) => [w.id, index + 1])),
    ),
    kanjiLevel: Object.fromEntries(
      ladder.flatMap((l) =>
        l.kanji.map((k) => [
          k,
          {
            level: l.level,
            waniKaniLevel: wkLevelOf.get(k) ?? null,
            /* What the JLPT says. Null where it says nothing. */
            nLevel: nLevelOf(k) || null,
            /* Which band actually decided where this kanji sits — the JLPT
               level where there is one, the school year where there is not.
               Recorded because the two differ for fourteen kanji, and anything
               reasoning about placement needs the one that placed them. */
            teachingBand: teachingBandOf(k) || null,
          },
        ]),
      ),
    ),
    ladder,
  };
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const sizes = ladder.map((l) => l.kanji.length);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  ${everything.length} kanji = WaniKani ${waniKani.length} + added joyo ${missing.length}`);
  console.log(`  ${LADDER_LEVELS} levels, ${Math.min(...sizes)}-${Math.max(...sizes)} kanji each`);
  console.log(`  overrides applied: ${overrides.length}`);
  console.log(`  curve L1-20: ${sizes.slice(0, 20).join(" ")}`);
  const vocabSizes = ladder.map((l) => l.vocabulary);
  const radicalSizes = ladder.map((l) => l.radicals);
  const totals = sizes.map((value, index) => value + vocabSizes[index] + radicalSizes[index]);
  console.log(`  radicals ${radicalLevel.size} of ${radicals.length} placed ${RADICAL_LEAD_LEVELS} levels before their first kanji (RADKFILE); ${unused.length} appear in no kanji we teach`);
  console.log(`  vocabulary ${vocabSizes.reduce((a, b) => a + b, 0)} words placed, ${unplaceable.length} unplaceable`);
  for (const entry of unplaceable) console.log(`    skipped ${entry.word} (uses a kanji the ladder never teaches)`);
  console.log(`  subjects per level: ${Math.min(...totals)}-${Math.max(...totals)} (WaniKani averages 156)`);
  console.log(`  L1-10 total: ${totals.slice(0, 10).join(" ")}`);
  for (const m of milestones) console.log(`  N${m.nLevel}: ${String(m.kanji).padStart(4)} kanji, 100% complete at level ${m.completeAtLevel}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
