/**
 * Ranks the vocabulary we teach by how common each word actually is.
 *
 * WaniKani's catalogue says nothing about frequency, and a word's kanji are a
 * bad proxy for it: scoring by kanji frequency promotes コーヒー but defers 父,
 * 雨 and 読む, which are day-one words whose kanji are simply uncommon in
 * newspapers. So the ranking comes from JMdict, which tags every entry from a
 * newspaper corpus.
 *
 * JMdict (EDRDG, CC BY-SA 4.0) marks entries with:
 *   nf01..nf48  frequency band in the Mainichi Shimbun corpus, 500 words each
 *   news1/2     top 12,000 / next 12,000 of that corpus
 *   ichi1/2     the Ichimango goi bunruishuu common-word list
 *   spec1/2     common words the other lists happen to miss
 *   gai1/2      common loanwords
 *
 * Reads a local JMdict_e; download it from
 * http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz and pass the path as an
 * argument. Writes only the words we teach, so nothing large lands in the repo.
 */
import fs from "node:fs/promises";
import path from "node:path";

const WK_LEVELS_DIR = path.resolve("src/data/wk-catalog-levels");
const OUTPUT_PATH = path.resolve("src/data/wordFrequency.json");
const DEFAULT_JMDICT = process.argv[2] ?? path.resolve("JMdict_e");

/** Words in the top band are rank ~250; nf48 is ~23,750. */
const BAND_SIZE = 500;
/** A word with no band at all sorts behind every ranked word. */
export const UNRANKED = 99_999;

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
      const merged = previous ? [...new Set([...previous, ...tags])] : tags;
      bySurface.set(surface, merged);
    }
  }
  return bySurface;
}

/**
 * Turns JMdict's tags into one rank, lower being more common. The nf band is
 * the real measure; the list memberships only rescue words the bands missed.
 */
export function rankFromTags(tags) {
  const band = tags.map((t) => /^nf(\d\d)$/.exec(t)).find(Boolean);
  if (band) return (Number(band[1]) - 1) * BAND_SIZE + BAND_SIZE / 2;
  if (tags.includes("news1") || tags.includes("ichi1") || tags.includes("spec1") || tags.includes("gai1")) return 12_000;
  if (tags.includes("news2") || tags.includes("ichi2") || tags.includes("spec2") || tags.includes("gai2")) return 24_000;
  return UNRANKED;
}

async function loadTaughtWords() {
  const index = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, "index.json"), "utf8"));
  const words = [];
  for (const file of index.files) {
    const level = JSON.parse(await fs.readFile(path.join(WK_LEVELS_DIR, file), "utf8"));
    for (const s of level.vocabulary ?? []) {
      if (s.hiddenAt === null && typeof s.characters === "string") {
        const reading = (s.readings ?? []).find((r) => r.primary)?.reading ?? null;
        words.push({ id: s.wkSubjectId, word: s.characters, reading });
      }
    }
  }
  return words;
}

async function main() {
  const xml = await fs.readFile(DEFAULT_JMDICT, "utf8");
  const tagsBySurface = parseJmdict(xml);
  const words = await loadTaughtWords();

  const ranks = {};
  let ranked = 0;
  for (const entry of words) {
    /* Prefer the written form; fall back to the reading for kana-only words. */
    const tags = tagsBySurface.get(entry.word) ?? (entry.reading ? tagsBySurface.get(entry.reading) : null);
    const rank = tags ? rankFromTags(tags) : UNRANKED;
    ranks[entry.id] = rank;
    if (rank !== UNRANKED) ranked += 1;
  }

  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), source: "JMdict (EDRDG), CC BY-SA 4.0", words: words.length, ranked, rank: ranks }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  JMdict surfaces with priority tags: ${tagsBySurface.size.toLocaleString()}`);
  console.log(`  words we teach: ${words.length.toLocaleString()}, ranked: ${ranked.toLocaleString()} (${((ranked / words.length) * 100).toFixed(1)}%)`);
  const buckets = { "top 500": 0, "500-2k": 0, "2k-6k": 0, "6k-24k": 0, unranked: 0 };
  for (const rank of Object.values(ranks)) {
    if (rank <= 500) buckets["top 500"] += 1;
    else if (rank <= 2000) buckets["500-2k"] += 1;
    else if (rank <= 6000) buckets["2k-6k"] += 1;
    else if (rank < UNRANKED) buckets["6k-24k"] += 1;
    else buckets.unranked += 1;
  }
  console.log(`  ${Object.entries(buckets).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
