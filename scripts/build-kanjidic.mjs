#!/usr/bin/env node
/**
 * Builds the kanji dictionary from KANJIDIC2.
 *
 * The site knows kanji through three partial catalogues: what WaniKani teaches,
 * the JLPT table, and the school grades. Each was assembled for its own purpose,
 * so between them they lead with one meaning apiece and miss characters
 * outright - the JLPT table has no 鬱 and no 苺 at all. KANJIDIC2 is the
 * reference the others are footnotes to: 13,108 characters, every on and kun
 * reading, the name readings, the full meaning list, stroke counts, grades,
 * frequency ranks and the old JLPT levels.
 *
 * Source: http://www.edrdg.org/wiki/index.php/KANJIDIC_Project - the Electronic
 * Dictionary Research and Development Group, Creative Commons Attribution-Share
 * Alike 4.0. The attribution rides in the generated index and is shown to the
 * reader; the generated data carries the same licence, which is what share-alike
 * asks for.
 *
 * Only characters with an English meaning are kept - 10,384 of the 13,108 - and
 * the whole set comes to about 2MB, in line with the stroke data already here.
 * Ungraded characters are ordered by frequency, so the common ones a reader is
 * most likely to look up sit in the first file rather than behind 7,000 rarities.
 *
 * Usage: pnpm kanji:build
 */

import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const SOURCE_URL = "http://www.edrdg.org/kanjidic/kanjidic2.xml.gz";
const OUT_DIR = path.join(process.cwd(), "src", "data", "kanjidic");

/** Grades KANJIDIC2 assigns: 1-6 kyoiku, 8 the rest of joyo, 9-10 jinmeiyo. */
const GRADE_BUCKETS = [1, 2, 3, 4, 5, 6, 8, 9, 10];
/** Ungraded characters per file, so no single file dwarfs the others. */
const UNGRADED_CHUNK = 2500;

const ATTRIBUTION = {
  source: "KANJIDIC2",
  publisher: "Electronic Dictionary Research and Development Group",
  url: "http://www.edrdg.org/wiki/index.php/KANJIDIC_Project",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text) {
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name]);
}

function firstMatch(block, pattern) {
  const match = block.match(pattern);
  return match ? decode(match[1]) : null;
}

function allMatches(block, pattern) {
  return [...block.matchAll(pattern)].map((match) => decode(match[1]));
}

/** Absent stays absent: `Number(null)` is 0, which would grade every ungraded kanji. */
function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * One character's entry, or null when it has no English meaning.
 *
 * The XML is machine-generated and regular, so each field is read with its own
 * pattern rather than through a parser dependency - the approach the KanjiVG
 * build already takes with stroke paths. A `<meaning>` with no attribute is the
 * English one; the translated meanings all carry `m_lang`, so the plain tag is
 * exactly the set wanted.
 */
function parseCharacter(block) {
  const kanji = firstMatch(block, /<literal>(.*?)<\/literal>/);
  if (!kanji) return null;

  const meanings = allMatches(block, /<meaning>(.*?)<\/meaning>/g);
  if (meanings.length === 0) return null;

  /*
   * Shaped like a school-grade entry on purpose - same field names, same
   * grouped readings - so the two catalogues read the same way and a lookup
   * can fall through from one to the other without a translation step.
   */
  return {
    kanji,
    grade: toInt(firstMatch(block, /<grade>(\d+)<\/grade>/)),
    strokeCount: toInt(firstMatch(block, /<stroke_count>(\d+)<\/stroke_count>/)),
    frequencyRank: toInt(firstMatch(block, /<freq>(\d+)<\/freq>/)),
    /* The pre-2010 four-level JLPT, which is what KANJIDIC2 records. */
    jlptOld: toInt(firstMatch(block, /<jlpt>(\d+)<\/jlpt>/)),
    radical: toInt(firstMatch(block, /<rad_value rad_type="classical">(\d+)<\/rad_value>/)),
    primaryMeaning: meanings[0],
    meanings,
    readings: {
      on: allMatches(block, /<reading r_type="ja_on">(.*?)<\/reading>/g),
      kun: allMatches(block, /<reading r_type="ja_kun">(.*?)<\/reading>/g),
      nanori: allMatches(block, /<nanori>(.*?)<\/nanori>/g),
    },
  };
}

async function readSource() {
  const local = process.env.KANJIDIC_XML;
  if (local) {
    console.log(`Reading ${local}`);
    const raw = await fs.readFile(local);
    return local.endsWith(".gz") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  }

  console.log(`Downloading ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`KANJIDIC2 download failed: ${response.status}`);
  }
  return gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8");
}

/** Graded files first, then the ungraded ones in frequency order. */
function bucketEntries(entries) {
  const buckets = [];

  for (const grade of GRADE_BUCKETS) {
    const rows = entries.filter((entry) => entry.grade === grade);
    if (rows.length > 0) {
      buckets.push({ name: `grade-${String(grade).padStart(2, "0")}`, grade, rows });
    }
  }

  const ungraded = entries
    .filter((entry) => entry.grade === null)
    .sort((left, right) => {
      const leftRank = left.frequencyRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.frequencyRank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.kanji.localeCompare(right.kanji);
    });

  for (let index = 0; index * UNGRADED_CHUNK < ungraded.length; index += 1) {
    buckets.push({
      name: `other-${String(index + 1).padStart(2, "0")}`,
      grade: null,
      rows: ungraded.slice(index * UNGRADED_CHUNK, (index + 1) * UNGRADED_CHUNK),
    });
  }

  return buckets;
}

async function main() {
  const xml = await readSource();

  const databaseVersion = xml.match(/<database_version>(.*?)<\/database_version>/)?.[1] ?? null;
  const dateOfCreation = xml.match(/<date_of_creation>(.*?)<\/date_of_creation>/)?.[1] ?? null;

  const blocks = xml.split("<character>").slice(1);
  const entries = [];
  for (const block of blocks) {
    const entry = parseCharacter(block.split("</character>")[0]);
    if (entry) entries.push(entry);
  }

  if (entries.length < 9_000) {
    throw new Error(`Only ${entries.length} entries parsed; the source or the format changed.`);
  }

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const buckets = bucketEntries(entries);

  /* Every entry lands in exactly one file, or the build says so rather than shipping a hole. */
  const bucketed = buckets.reduce((total, bucket) => total + bucket.rows.length, 0);
  if (bucketed !== entries.length) {
    throw new Error(`Bucketing lost entries: ${bucketed} of ${entries.length} were written.`);
  }

  const files = [];

  for (const bucket of buckets) {
    const file = `kanjidic-${bucket.name}.json`;
    await fs.writeFile(
      path.join(OUT_DIR, file),
      `${JSON.stringify({ attribution: ATTRIBUTION, kanji: bucket.rows }, null, 2)}\n`,
      "utf8",
    );
    files.push({
      file,
      grade: bucket.grade,
      count: bucket.rows.length,
      /* The characters this file holds, so a lookup opens one file and no more. */
      characters: bucket.rows.map((row) => row.kanji).join(""),
    });
  }

  await fs.writeFile(
    path.join(OUT_DIR, "index.json"),
    `${JSON.stringify(
      { attribution: { ...ATTRIBUTION, databaseVersion, dateOfCreation }, totalCount: entries.length, files },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Parsed ${blocks.length} characters, kept ${entries.length} with English meanings.`);
  console.log(`Wrote ${files.length} files to src/data/kanjidic (database ${databaseVersion}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
