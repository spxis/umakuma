/**
 * Which kanji get mistaken for which.
 *
 * A learner's hardest kanji are rarely the complicated ones; they are the
 * pairs that differ by a stroke. 土 and 士, 未 and 末, 料 and 科. Meeting one
 * of a pair with nothing to tell it from the other is how a character gets
 * learned wrong and stays wrong, and the ladder cannot fix that by itself:
 * measured against the placements this repo already computes, eleven of the
 * twelve classic pairs sit in different JLPT bands, a median of 21 levels
 * apart. 土 is N5 and 士 is N1. No ordering rule can put those side by side
 * without breaking the promise that N5 is finished by level 10, so the pairing
 * has to be something a member is *told*, at the second meeting, whenever that
 * falls.
 *
 * Two sources, because neither is enough alone. Of the 3,538 pairs they make
 * between them only 415 are in both:
 *
 *   Stroke-edit distance (Lars Yencken, CC BY 3.0) scores every pair of the
 *   1,945 pre-2010 joyo kanji by how few stroke edits separate them, and keeps
 *   each character's ten nearest. 1,427 of its pairs appear nowhere in
 *   WaniKani's lists — 田/由, 入/八, 土/工, 升/斤 — the ones that differ by a
 *   stroke rather than by a component, which is the class a decomposition
 *   cannot see at all.
 *
 *   WaniKani's own visually-similar lists are hand-made, and hold 1,696 pairs
 *   the distance data does not — 千/干, 刀/刃, 昨/作, 技/枝, 役/設 — of which
 *   1,110 it never scores at any distance. A person pairing two characters
 *   knows something a stroke count does not.
 *
 * So the file is a union rather than a choice.
 *
 * And an overrides file, which is how a pair either source got wrong gets
 * fixed without waiting for either of them: `src/data/kanjiConfusablesOverrides.json`
 * adds and removes pairs by hand, and its additions are marked `manual` so a
 * page can say where a pairing came from.
 *
 * Reads only files, never the database, so it runs in CI without DATABASE_URL.
 * Regenerate with `pnpm build:kanji-confusables`.
 */
import fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.resolve(process.env.CORPORA_DIR ?? ".corpora");
const CONFUSION_PATH = path.join(CACHE_DIR, "kanji-confusion.csv");
const WK_LEVELS_DIR = path.resolve("src/data/wk-catalog-levels");
const OVERRIDES_PATH = path.resolve("src/data/kanjiConfusablesOverrides.json");
const OUTPUT_PATH = path.resolve("src/data/kanjiConfusables.json");

export const CONFUSABLE_SOURCES = {
  strokeEditDistance: "stroke-edit-distance",
  wanikani: "wanikani",
  manual: "manual",
};

/**
 * How close two characters have to be before the pair is worth naming.
 *
 * Measured over our 2,235: at 0.7 the union holds 3,528 pairs inside the
 * ladder and 1,747 characters (78%) have at least one, a median of three each.
 * Dropping to 0.6 takes that median to seven, which is no longer a warning but
 * a list; going up to 0.8 leaves 235 characters with nothing. The scores are a
 * distance measure rather than a judgement, so the threshold is where a reader
 * would still agree with the pairing, not where the maths stops.
 */
export const MIN_SIMILARITY = 0.7;

/**
 * How many a character may show.
 *
 * 325 characters have more than six neighbours above the threshold and one has
 * 25. A warning that lists 25 things is not a warning.
 */
export const MAX_PER_KANJI = 6;

/**
 * What a WaniKani pairing counts as, next to a measured distance.
 *
 * Their lists are hand-made rather than scored, so a number has to be chosen
 * for them or they would sort below every measured pair. It sits just above
 * the threshold and below the strong matches: a person decided these are
 * confusable, which is better evidence than a distance of 0.71 and weaker than
 * one of 0.95.
 */
export const WANIKANI_SCORE = 0.78;

/** `土 士` either way round, so a pair is stored once. */
function pairKey(a, b) {
  return a < b ? `${a} ${b}` : `${b} ${a}`;
}

/**
 * The dataset's own shape: a pivot character, then ten neighbour/score pairs,
 * space separated. A pair appears twice, once from each side, and the two
 * scores can differ slightly — the higher is kept, since the question is
 * whether anybody confuses them and not from which direction.
 */
export function parseStrokeEditDistance(text, minimum = MIN_SIMILARITY) {
  const scores = new Map();
  for (const line of text.trim().split("\n")) {
    const fields = line.trim().split(/\s+/);
    const pivot = fields[0];
    if (!pivot) continue;
    for (let index = 1; index + 1 < fields.length; index += 2) {
      const neighbour = fields[index];
      const score = Number(fields[index + 1]);
      if (!neighbour || neighbour === pivot || !Number.isFinite(score) || score < minimum) continue;
      const key = pairKey(pivot, neighbour);
      scores.set(key, Math.max(scores.get(key) ?? 0, score));
    }
  }
  return scores;
}

/** WaniKani's hand-made lists, read from the committed catalogue export. */
async function loadWaniKaniPairs() {
  const files = (await fs.readdir(WK_LEVELS_DIR)).filter((name) => name.startsWith("level-"));
  const characterOf = new Map();
  const similar = new Map();
  for (const file of files) {
    const level = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, file), "utf8"));
    for (const subject of level.kanji ?? []) {
      if (subject.hiddenAt || !subject.characters) continue;
      characterOf.set(subject.wkSubjectId, subject.characters);
      similar.set(subject.wkSubjectId, subject.visuallySimilarSubjectIds ?? []);
    }
  }

  const pairs = new Set();
  for (const [subjectId, ids] of similar) {
    const from = characterOf.get(subjectId);
    for (const id of ids) {
      const to = characterOf.get(id);
      if (!from || !to || from === to) continue;
      pairs.add(pairKey(from, to));
    }
  }
  return pairs;
}

/** Hand corrections: `{ add: [{ pair, reason }], remove: [{ pair, reason }] }`. */
export function parseOverrides(text) {
  const empty = { add: [], remove: [] };
  if (!text.trim()) return empty;
  const parsed = JSON.parse(text);
  const read = (entries) =>
    (Array.isArray(entries) ? entries : [])
      .map((entry) => entry?.pair)
      .filter((pair) => Array.isArray(pair) && pair.length === 2 && pair[0] && pair[1] && pair[0] !== pair[1])
      .map(([a, b]) => [String(a), String(b)]);
  return { add: read(parsed.add), remove: read(parsed.remove) };
}

/**
 * The three sources folded into one map of pairs, each carrying every source
 * that named it. A pair both sources hold keeps the measured score; a pair
 * only WaniKani or a person names takes the standing one for that source.
 */
export function mergeConfusables({ scores, wanikaniPairs, overrides }) {
  const pairs = new Map();
  const put = (key, source, score) => {
    const existing = pairs.get(key);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      existing.score = Math.max(existing.score, score);
      return;
    }
    pairs.set(key, { sources: [source], score });
  };

  for (const [key, score] of scores) put(key, CONFUSABLE_SOURCES.strokeEditDistance, score);
  for (const key of wanikaniPairs) put(key, CONFUSABLE_SOURCES.wanikani, WANIKANI_SCORE);
  for (const [a, b] of overrides.add) put(pairKey(a, b), CONFUSABLE_SOURCES.manual, 1);
  /* Removal is last and absolute: a person saying two characters are not
     confusable outranks both datasets saying they are. */
  for (const [a, b] of overrides.remove) pairs.delete(pairKey(a, b));

  return pairs;
}

/**
 * The pairs as each character's own list, strongest first, capped.
 *
 * Symmetric on purpose: if 土 lists 士 then 士 lists 土, whichever direction
 * the source stated it in. A one-way warning is a warning the member only sees
 * if they happen to arrive from the right side.
 */
export function neighboursByKanji(pairs, maxPerKanji = MAX_PER_KANJI) {
  const gathered = new Map();
  const add = (from, to, entry) => {
    if (!gathered.has(from)) gathered.set(from, []);
    /* Three places is more than the difference between two pairs ever means. */
    gathered.get(from).push({ kanji: to, score: Math.round(entry.score * 1000) / 1000, sources: [...entry.sources].sort() });
  };
  for (const [key, entry] of pairs) {
    const [a, b] = key.split(" ");
    add(a, b, entry);
    add(b, a, entry);
  }

  const byScore = (one, other) => other.score - one.score || one.kanji.localeCompare(other.kanji);
  const neighbours = {};
  for (const kanji of [...gathered.keys()].sort()) {
    neighbours[kanji] = gathered.get(kanji).sort(byScore).slice(0, maxPerKanji);
  }

  /*
   * The cap alone breaks the symmetry it is supposed to preserve: 士 keeps 土
   * because it has few look-alikes, while 土 has seven stronger ones and drops
   * 士 off the end. That is the one-way warning again, arrived at by a
   * different route - and the direction it fails in is the direction a member
   * meets the pair, since the crowded character is usually the commoner one.
   *
   * So a pair kept by either side is kept by both. It takes 275 of the 1,752
   * characters over the cap and the longest list reaches 16, which is the
   * price of never dropping the warning on the character a member is reading.
   */
  for (const [kanji, kept] of Object.entries(neighbours)) {
    for (const neighbour of kept) {
      const other = neighbours[neighbour.kanji];
      if (!other || other.some((entry) => entry.kanji === kanji)) continue;
      other.push({ kanji, score: neighbour.score, sources: [...neighbour.sources] });
      other.sort(byScore);
    }
  }
  return neighbours;
}

async function main() {
  const text = await fs.readFile(CONFUSION_PATH, "utf8").catch(() => null);
  if (text === null) {
    console.error(`No ${CONFUSION_PATH}. Run \`pnpm corpora:fetch\` first.`);
    process.exit(1);
  }

  const scores = parseStrokeEditDistance(text);
  const wanikaniPairs = await loadWaniKaniPairs();
  const overrides = parseOverrides(await fs.readFile(OVERRIDES_PATH, "utf8").catch(() => ""));
  const pairs = mergeConfusables({ scores, wanikaniPairs, overrides });
  const neighbours = neighboursByKanji(pairs);

  const counted = (source) => [...pairs.values()].filter((entry) => entry.sources.includes(source)).length;
  const output = {
    generatedAt: new Date().toISOString(),
    minSimilarity: MIN_SIMILARITY,
    maxPerKanji: MAX_PER_KANJI,
    pairs: pairs.size,
    source: {
      [CONFUSABLE_SOURCES.strokeEditDistance]: counted(CONFUSABLE_SOURCES.strokeEditDistance),
      [CONFUSABLE_SOURCES.wanikani]: counted(CONFUSABLE_SOURCES.wanikani),
      [CONFUSABLE_SOURCES.manual]: counted(CONFUSABLE_SOURCES.manual),
    },
    neighbours,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  console.log(`  pairs ${pairs.size}  characters ${Object.keys(neighbours).length}`);
  console.log(
    `  stroke-edit distance ${output.source[CONFUSABLE_SOURCES.strokeEditDistance]}` +
      `  WaniKani ${output.source[CONFUSABLE_SOURCES.wanikani]}` +
      `  by hand ${output.source[CONFUSABLE_SOURCES.manual]}`,
  );
}

/* Importable for the tests without running the build. */
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
