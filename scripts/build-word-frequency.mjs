/**
 * Ranks the vocabulary we teach by how common each word actually is.
 *
 * WaniKani's catalogue says nothing about frequency, and a word's kanji are a
 * bad proxy for it: ranking by kanji frequency promotes コーヒー but defers 父,
 * 雨 and 読む, day-one words whose kanji are merely uncommon in print.
 *
 * Two kinds of source, because "useful" has more than one meaning:
 *
 *   JMdict (EDRDG) tags entries by frequency band in a newspaper corpus —
 *   nf01..nf48 at 500 words each, plus the news/ichi/spec/gai common-word
 *   lists. This is the written, formal register.
 *
 *   Jiten (jiten.moe) publishes a frequency list per medium, from a corpus of
 *   16,232 titles: anime, drama, film, novels, manga, games and more. This is
 *   what people actually say and read for pleasure.
 *
 * Both CC BY-SA 4.0, both fetched by scripts/fetch-corpora.mjs. A word's final
 * score is a weighted blend, so a word common in anime is not buried for being
 * absent from newspapers, and vice versa.
 */
import fs from "node:fs/promises";
import path from "node:path";

const WK_LEVELS_DIR = path.resolve("src/data/wk-catalog-levels");
const CACHE_DIR = path.resolve(process.env.CORPORA_DIR ?? ".corpora");
const OUTPUT_PATH = path.resolve("src/data/wordFrequency.json");

/** Words in the top JMdict band are rank ~250; nf48 is ~23,750. */
const BAND_SIZE = 500;
/** Stands in for "this corpus has never seen the word". */
export const UNRANKED = 500_000;

/**
 * How much each register counts. Newspapers carry the most weight because they
 * are the widest written vocabulary, but spoken media are what make a word
 * feel worth knowing, so together they outweigh it.
 */
export const CORPUS_WEIGHTS = {
  newspaper: 1.0,
  global: 0.8,
  anime: 0.7,
  drama: 0.4,
  movie: 0.3,
  novel: 0.3,
  manga: 0.3,
  visualNovel: 0.15,
  videoGame: 0.15,
  nonFiction: 0.15,
  webNovel: 0.1,
  audio: 0.1,
};

/** Pulls surface form -> priority tags out of JMdict's XML. */
export function parseJmdict(xml) {
  const bySurface = new Map();
  for (const entry of xml.split("<entry>").slice(1)) {
    for (const element of [...entry.matchAll(/<([kr])_ele>([\s\S]*?)<\/\1_ele>/g)]) {
      const body = element[2];
      const surface = body.match(/<(?:keb|reb)>([\s\S]*?)<\/(?:keb|reb)>/)?.[1];
      if (!surface) continue;
      const tags = [...body.matchAll(/<(?:ke|re)_pri>([\s\S]*?)<\/(?:ke|re)_pri>/g)].map((m) => m[1]);
      if (tags.length === 0) continue;
      const previous = bySurface.get(surface);
      bySurface.set(surface, previous ? [...new Set([...previous, ...tags])] : tags);
    }
  }
  return bySurface;
}

/**
 * JMdict's own version. The file stamps no date, but its DTD carries a revision
 * history and the highest entry is the release we parsed — which is what an
 * admin needs to tell whether the deployed copy is behind upstream.
 */
export function jmdictRevision(xml) {
  const revisions = [...xml.slice(0, 40_000).matchAll(/Rev (\d+\.\d+)/g)].map((match) => match[1]);
  if (revisions.length === 0) return null;
  return revisions.sort((left, right) => Number(right) - Number(left))[0];
}

/** Turns JMdict's tags into one rank, lower being more common. */
export function rankFromTags(tags) {
  const band = tags.map((t) => /^nf(\d\d)$/.exec(t)).find(Boolean);
  if (band) return (Number(band[1]) - 1) * BAND_SIZE + BAND_SIZE / 2;
  if (tags.includes("news1") || tags.includes("ichi1") || tags.includes("spec1") || tags.includes("gai1")) return 12_000;
  if (tags.includes("news2") || tags.includes("ichi2") || tags.includes("spec2") || tags.includes("gai2")) return 24_000;
  return UNRANKED;
}

/** Reads a Jiten CSV into surface -> best rank. Columns are Word, Form, Rank. */
export function parseJitenCsv(text) {
  const ranks = new Map();
  const lines = text.split("\n");
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const [word, form, rankText] = line.split(",");
    const rank = Number(rankText);
    if (!Number.isFinite(rank)) continue;
    /* Both the dictionary form and the written form should find the word. */
    for (const surface of [word, form]) {
      if (!surface) continue;
      const seen = ranks.get(surface);
      if (seen === undefined || rank < seen) ranks.set(surface, rank);
    }
  }
  return ranks;
}

/**
 * Blends a word's ranks into one score. Ranks are heavy-tailed — the gap from
 * 1 to 100 matters far more than 10,000 to 10,100 — so they are averaged in log
 * space, weighted by register, and only over the corpora that know the word.
 */
export function blendRanks(ranks) {
  let weighted = 0;
  let total = 0;
  for (const [corpus, weight] of Object.entries(CORPUS_WEIGHTS)) {
    const rank = ranks[corpus];
    if (rank === undefined || rank === null || rank >= UNRANKED) continue;
    weighted += Math.log(rank) * weight;
    total += weight;
  }
  if (total === 0) return UNRANKED;
  return Math.round(Math.exp(weighted / total));
}

async function loadTaughtWords() {
  const index = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, "index.json"), "utf8"));
  const words = [];
  for (const file of index.files) {
    const level = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, file), "utf8"));
    for (const s of level.vocabulary ?? []) {
      if (s.hiddenAt === null && typeof s.characters === "string") {
        words.push({
          id: s.wkSubjectId,
          word: s.characters,
          reading: (s.readings ?? []).find((r) => r.primary)?.reading ?? null,
        });
      }
    }
  }
  return words;
}

async function main() {
  const words = await loadTaughtWords();
  const corpora = {};

  const jmdictPath = path.join(CACHE_DIR, "JMdict_e");
  const jmdictXml = await fs.readFile(jmdictPath, "utf8");
  const jmdictVersion = jmdictRevision(jmdictXml);
  const tagsBySurface = parseJmdict(jmdictXml);
  corpora.newspaper = new Map();
  for (const [surface, tags] of tagsBySurface) corpora.newspaper.set(surface, rankFromTags(tags));

  for (const name of Object.keys(CORPUS_WEIGHTS)) {
    if (name === "newspaper") continue;
    const file = path.join(CACHE_DIR, `jiten-${name}.csv`);
    try {
      corpora[name] = parseJitenCsv(await fs.readFile(file, "utf8"));
    } catch {
      console.log(`  ${name}: no cached list, skipped`);
    }
  }

  const names = Object.keys(corpora);
  const rank = {};
  const detail = {};
  const covered = Object.fromEntries(names.map((n) => [n, 0]));
  let blendedCount = 0;
  for (const entry of words) {
    const perCorpus = {};
    for (const name of names) {
      const table = corpora[name];
      const found = table.get(entry.word) ?? (entry.reading ? table.get(entry.reading) : undefined);
      if (found !== undefined && found < UNRANKED) {
        perCorpus[name] = found;
        covered[name] += 1;
      }
    }
    const score = blendRanks(perCorpus);
    if (score < UNRANKED) blendedCount += 1;
    rank[entry.id] = score;
    /* Keep only the registers worth showing a member — "common in anime" is
       worth a badge, "rank 8,412 in web novels" is not. The rest stay out so
       the committed file stays small; rerun to get them back. */
    detail[entry.id] = {
      newspaper: perCorpus.newspaper ?? null,
      anime: perCorpus.anime ?? null,
      global: perCorpus.global ?? null,
    };
  }

  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: [
          "JMdict (EDRDG), CC BY-SA 4.0",
          "Jiten frequency lists (jiten.moe), CC BY-SA 4.0",
        ],
        corpora: names,
        versions: { jmdict: jmdictVersion },
        weights: CORPUS_WEIGHTS,
        words: words.length,
        ranked: blendedCount,
        /* How many of our words each corpus knows. Recorded here so the source
           pages can report coverage without counting 6,800 entries per view. */
        coverage: covered,
        rank,
        detail,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  JMdict DTD revision: ${jmdictVersion ?? "unknown"}`);
  console.log(`  words we teach: ${words.length.toLocaleString()}, blended rank: ${blendedCount.toLocaleString()} (${((blendedCount / words.length) * 100).toFixed(1)}%)`);
  for (const name of names) {
    console.log(`  ${name.padEnd(12)} covers ${String(covered[name]).padStart(5)} (${((covered[name] / words.length) * 100).toFixed(0)}%)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
