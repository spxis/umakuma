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
 * Re-ordering costs nothing structurally — WaniKani kanji are composed of
 * radicals, never of other kanji, so no kanji-on-kanji dependency can invert.
 * Inside a band we keep WaniKani's order, which is a clean topological sort of
 * the radical -> kanji graph.
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
 * Reads only files, never the database, so it runs in CI without DATABASE_URL.
 */
import fs from "node:fs/promises";
import path from "node:path";

const WK_LEVELS_DIR = path.resolve("src/data/wk-catalog-levels");
const KANJIDIC_DIR = path.resolve("src/data/kanjidic");
const JLPT_READINGS_PATH = path.resolve("src/data/jlptReadings.json");
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
const VOCABULARY_RAMP_LEVELS = 20;
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
export function placeVocabulary(words, levelOfKanji, kanjiPerLevel) {
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
    waiting.sort((a, b) => a.floor - b.floor || a.waniKaniLevel - b.waniKaniLevel || a.id - b.id);
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
  const wkPosition = new Map(waniKani.map((entry, index) => [entry.kanji, index]));
  const frequencyOf = (kanji) => dictionary.get(kanji)?.frequencyRank ?? Number.MAX_SAFE_INTEGER;
  const nLevelOf = (kanji) => jlpt[kanji]?.nLevel ?? NO_JLPT_LEVEL;

  /* Inside a band keep WaniKani's order; kanji it never teaches slot in by how
     common they are in print, which is the best proxy we have for need. */
  const sortWithinBand = (a, b) => {
    const positionA = wkPosition.get(a);
    const positionB = wkPosition.get(b);
    if (positionA !== undefined && positionB !== undefined) return positionA - positionB;
    if (positionA !== undefined) return -1;
    if (positionB !== undefined) return 1;
    return frequencyOf(a) - frequencyOf(b);
  };

  const levels = [];
  let previousThrough = 0;
  for (const band of JLPT_BANDS) {
    const isFinalBand = band.throughLevel === LADDER_LEVELS;
    const members = everything
      .filter((kanji) => {
        const n = nLevelOf(kanji);
        return isFinalBand ? n === band.nLevel || n === NO_JLPT_LEVEL : n === band.nLevel;
      })
      .sort(sortWithinBand);
    const span = band.throughLevel - previousThrough;
    const sizes = rampedSizes(members.length, span, band.shape);
    let at = 0;
    sizes.forEach((size, offset) => {
      levels.push({ level: previousThrough + offset + 1, nLevel: band.nLevel, kanji: members.slice(at, at + size) });
      at += size;
    });
    previousThrough = band.throughLevel;
  }

  const levelOfKanji = new Map(levels.flatMap((l) => l.kanji.map((k) => [k, l.level])));
  const vocabulary = await loadWaniKaniVocabulary();
  const { placed, unplaceable } = placeVocabulary(
    vocabulary,
    levelOfKanji,
    levels.map((l) => l.kanji.length),
  );

  const added = new Set(missing.map((entry) => entry.kanji));
  const wkLevelOf = new Map(waniKani.map((entry) => [entry.kanji, entry.waniKaniLevel]));
  const ladder = levels.map((entry, index) => ({
    ...entry,
    fromWaniKani: entry.kanji.filter((k) => !added.has(k)).length,
    added: entry.kanji.filter((k) => added.has(k)).length,
    vocabulary: placed[index].length,
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
    milestones,
    vocabularyLevel: Object.fromEntries(
      placed.flatMap((words, index) => words.map((w) => [w.id, index + 1])),
    ),
    kanjiLevel: Object.fromEntries(
      ladder.flatMap((l) =>
        l.kanji.map((k) => [k, { level: l.level, waniKaniLevel: wkLevelOf.get(k) ?? null, nLevel: nLevelOf(k) || null }]),
      ),
    ),
    ladder,
  };
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const sizes = ladder.map((l) => l.kanji.length);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  ${everything.length} kanji = WaniKani ${waniKani.length} + added joyo ${missing.length}`);
  console.log(`  ${LADDER_LEVELS} levels, ${Math.min(...sizes)}-${Math.max(...sizes)} kanji each`);
  console.log(`  curve L1-20: ${sizes.slice(0, 20).join(" ")}`);
  const vocabSizes = ladder.map((l) => l.vocabulary);
  const totals = sizes.map((value, index) => value + vocabSizes[index]);
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
