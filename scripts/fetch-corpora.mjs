/**
 * Downloads the outside data the ladder is built from, so the whole chain can
 * be re-run. WaniKani moves kanji between levels and adds radicals, and our
 * levels are recomputed from scratch each time rather than patched, so every
 * input has to be fetchable on demand.
 *
 * Nothing here lands in the repo: the downloads go to a cache directory that
 * git ignores, and only the small derived files under src/data are committed.
 *
 * Sources:
 *   JMdict  — EDRDG, CC BY-SA 4.0. Newspaper-corpus frequency tags per word.
 *   Jiten   — jiten.moe, CC BY-SA 4.0. Frequency lists per medium, from 16,232
 *     titles.
 *   Kanji confusion — Lars Yencken, CC BY 3.0. Which characters get mistaken
 *     for which, as stroke-edit distance over the 1,945 pre-2010 joyo kanji.
 */
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { createGunzip } from "node:zlib";

const CACHE_DIR = path.resolve(process.env.CORPORA_DIR ?? ".corpora");
const JMDICT_URL = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
const JITEN_DOWNLOAD = "https://api.jiten.moe/api/frequency-list/download";
/*
 * The neighbour list, not the raw experiment.
 *
 * The same dataset publishes the human judgements it was validated against —
 * 2,660 ratings from an actual confusion study — and they are the better
 * evidence, but they cover a few hundred pairs. This file is the derived one:
 * every joyo character's ten nearest neighbours by stroke-edit distance, which
 * is the coverage a curriculum needs.
 */
const KANJI_CONFUSION_URL =
  "https://lars.yencken.org/datasets/kanji-confusion/jyouyou__strokeEditDistance.csv";

/** Jiten's media types. Omitting the parameter gives the combined list. */
export const JITEN_MEDIA = [
  ["global", null],
  ["anime", 1],
  ["drama", 2],
  ["movie", 3],
  ["novel", 4],
  ["nonFiction", 5],
  ["videoGame", 6],
  ["visualNovel", 7],
  ["webNovel", 8],
  ["manga", 9],
  ["audio", 10],
  ["youtube", 11],
];

async function download(url, destination, { gunzip = false, optional = false } = {}) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    /* Jiten lists a medium in its enum before the list itself exists. */
    if (optional && response.status === 404) return null;
    throw new Error(`${url} returned ${response.status}`);
  }
  const out = createWriteStream(destination);
  await (gunzip
    ? pipeline(response.body, createGunzip(), out)
    : pipeline(response.body, out));
  const { size } = await fs.stat(destination);
  return size;
}

/** Skips a download when the cached copy is younger than a week. */
async function isFresh(file, maxAgeDays = 7) {
  try {
    const { mtime } = await fs.stat(file);
    return Date.now() - mtime.getTime() < maxAgeDays * 86_400_000;
  } catch {
    return false;
  }
}

async function main() {
  const force = process.argv.includes("--force");
  await fs.mkdir(CACHE_DIR, { recursive: true });
  console.log(`Cache: ${CACHE_DIR}`);

  const jmdict = path.join(CACHE_DIR, "JMdict_e");
  if (!force && (await isFresh(jmdict))) {
    console.log("  JMdict_e — cached");
  } else {
    const size = await download(JMDICT_URL, jmdict, { gunzip: true });
    console.log(`  JMdict_e — ${(size / 1e6).toFixed(1)}MB`);
  }

  for (const [name, mediaType] of JITEN_MEDIA) {
    const file = path.join(CACHE_DIR, `jiten-${name}.csv`);
    if (!force && (await isFresh(file))) {
      console.log(`  jiten-${name}.csv — cached`);
      continue;
    }
    const query = new URLSearchParams({ downloadType: "csv" });
    if (mediaType !== null) query.set("mediaType", String(mediaType));
    const size = await download(`${JITEN_DOWNLOAD}?${query}`, file, { optional: true });
    if (size === null) {
      await fs.rm(file, { force: true });
      console.log(`  jiten-${name}.csv — not published yet, skipped`);
      continue;
    }
    console.log(`  jiten-${name}.csv — ${(size / 1e6).toFixed(1)}MB`);
  }

  const confusion = path.join(CACHE_DIR, "kanji-confusion.csv");
  if (!force && (await isFresh(confusion))) {
    console.log("  kanji-confusion.csv — cached");
  } else {
    const size = await download(KANJI_CONFUSION_URL, confusion);
    console.log(`  kanji-confusion.csv — ${(size / 1e3).toFixed(0)}kB`);
  }

  console.log("\nNext: pnpm build:word-frequency && pnpm build:kanji-ladder && pnpm build:kanji-confusables");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
