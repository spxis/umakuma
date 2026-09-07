#!/usr/bin/env node
/**
 * Builds the stroke-order data from KanjiVG.
 *
 * KanjiVG ships one SVG per character holding each stroke as its own `<path>`,
 * in the order the character is written. That is what lets the site animate a
 * kanji being drawn rather than show a picture of the finished one.
 *
 * Source: https://kanjivg.tagaini.net — Creative Commons Attribution-Share
 * Alike 3.0. The attribution rides in every generated file and is shown to the
 * reader; the generated data carries the same licence, which is what share-alike
 * asks for.
 *
 * Pinned to a commit rather than master so a rebuild is reproducible, in the
 * same spirit as `map:build`.
 *
 * Usage: pnpm strokes:build
 */

import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const KANJIVG_COMMIT = "61e39cfc29724132a6f8823b166296932985a0ff";
const TARBALL = `https://codeload.github.com/KanjiVG/kanjivg/tar.gz/${KANJIVG_COMMIT}`;
const OUT_DIR = path.join(process.cwd(), "src", "data", "stroke-order");
const GRADES_DIR = path.join(process.cwd(), "src", "data", "school-grades");
const KANJIDIC_DIR = path.join(process.cwd(), "src", "data", "kanjidic");
const WK_DIR = path.join(process.cwd(), "src", "data", "wk-catalog-levels");

const ATTRIBUTION = {
  source: "KanjiVG",
  url: "https://kanjivg.tagaini.net",
  licence: "CC BY-SA 3.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  commit: KANJIVG_COMMIT,
};

/**
 * How many characters share one file outside the school grades.
 *
 * The grade files are the school's own buckets and stay as they are. What is
 * left is a few thousand characters with no grade to sort them into, and one
 * file of those is several megabytes that a lookup would have to open to find
 * a single character. Split at a size in the same range as the grade files.
 */
const OTHER_BUCKET_SIZE = 900;

/** The characters worth shipping: everything our own catalogues teach. */
async function wantedKanji() {
  const index = JSON.parse(await fs.readFile(path.join(GRADES_DIR, "index.json"), "utf8"));
  const byGrade = new Map();

  for (const entry of index.grades) {
    const file = JSON.parse(await fs.readFile(path.join(GRADES_DIR, entry.filePath), "utf8"));
    byGrade.set(entry.grade, file.kanji.map((item) => item.kanji));
  }

  return byGrade;
}

/**
 * The kanji WaniKani teaches that no school grade covers.
 *
 * WaniKani goes beyond the joyo and jinmeiyo lists - 醤, 鰐, 嘘 and about
 * seventeen others - and those are exactly the characters a learner is least
 * sure how to write, so leaving them without stroke order would be backwards.
 */
async function wanikaniExtras(alreadyCovered) {
  const extras = new Set();
  let files;
  try {
    files = (await fs.readdir(WK_DIR)).filter((name) => name.startsWith("level-"));
  } catch {
    return extras;
  }

  for (const name of files) {
    const parsed = JSON.parse(await fs.readFile(path.join(WK_DIR, name), "utf8"));
    const rows = Array.isArray(parsed) ? parsed : (parsed.kanji ?? []);
    for (const row of rows) {
      const characters = row?.characters;
      const type = row?.subjectType ?? row?.object;
      if (type === "kanji" && typeof characters === "string" && [...characters].length === 1 && !alreadyCovered.has(characters)) {
        extras.add(characters);
      }
    }
  }

  return extras;
}

/**
 * Everything else KanjiVG draws that our dictionary can describe.
 *
 * The build shipped only what our own catalogues teach - 2,919 characters -
 * and every other page said "No stroke order for this character". Jisho draws
 * 竃 from this same source at this same commit; we simply were not asking for
 * it. John, comparing the two: "we are using the same sources. i think that's
 * a miss for us."
 *
 * Bounded by KANJIDIC rather than by the directory: KanjiVG also draws kana
 * and a scattering of characters no dictionary here holds, and a page that
 * cannot say what a character means has no business animating it.
 */
async function dictionaryCharacters() {
  const index = JSON.parse(await fs.readFile(path.join(KANJIDIC_DIR, "index.json"), "utf8"));
  const characters = new Set();
  for (const file of index.files) {
    for (const character of file.characters) characters.add(character);
  }
  return characters;
}

function codepointName(kanji) {
  return kanji.codePointAt(0).toString(16).padStart(5, "0");
}

/**
 * The stroke paths, in writing order.
 *
 * The files are generated and well formed, and every `<path>` in one is a
 * stroke, so reading them in document order is the order they are written.
 */
function strokesFromSvg(svg) {
  return [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
}

async function main() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kanjivg-"));
  const tarPath = path.join(tmp, "kanjivg.tar.gz");

  process.stdout.write(`Downloading KanjiVG @ ${KANJIVG_COMMIT.slice(0, 7)}... `);
  const response = await fetch(TARBALL);
  if (!response.ok) {
    throw new Error(`KanjiVG download failed: ${response.status}`);
  }
  await pipeline(response.body, createWriteStream(tarPath));
  console.log("done");

  await run("tar", ["-xzf", tarPath, "-C", tmp]);
  const [extracted] = (await fs.readdir(tmp)).filter((name) => name.startsWith("kanjivg-"));
  const kanjiDir = path.join(tmp, extracted, "kanji");

  const byGrade = await wantedKanji();
  const schoolCharacters = new Set([...byGrade.values()].flat());
  const extras = await wanikaniExtras(schoolCharacters);
  if (extras.size > 0) {
    // Bucket 0: outside the school grades, so it sorts before them.
    byGrade.set(0, [...extras]);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });

  let written = 0;
  let missing = 0;
  const index = [];

  /* One file, and what the index has to say about it. The `characters` string
     is what makes a lookup open one file rather than walk the buckets, the
     same shape the KANJIDIC index uses for the same reason. */
  async function writeBucket(outFile, grade, characters) {
    const entries = [];

    for (const kanji of characters) {
      // Variant files carry a suffix; the base file is the standard form.
      const file = path.join(kanjiDir, `${codepointName(kanji)}.svg`);
      let svg;
      try {
        svg = await fs.readFile(file, "utf8");
      } catch {
        missing += 1;
        continue;
      }

      const strokes = strokesFromSvg(svg);
      if (strokes.length === 0) {
        missing += 1;
        continue;
      }

      entries.push({ kanji, strokes, strokeCount: strokes.length });
      written += 1;
    }

    if (entries.length === 0) return;

    await fs.writeFile(
      path.join(OUT_DIR, outFile),
      `${JSON.stringify({ grade, viewBox: "0 0 109 109", attribution: ATTRIBUTION, kanji: entries }, null, 2)}\n`,
    );
    index.push({
      grade,
      file: outFile,
      count: entries.length,
      characters: entries.map((entry) => entry.kanji).join(""),
    });
    console.log(`  ${outFile}: ${entries.length} characters`);
  }

  for (const [grade, characters] of [...byGrade.entries()].sort((a, b) => a[0] - b[0])) {
    await writeBucket(`grade-${String(grade).padStart(2, "0")}.json`, grade, characters);
  }

  /*
   * Everything else the dictionary describes, in buckets of its own.
   *
   * Sorted by codepoint so a rebuild puts the same character in the same file
   * and the diff is readable. They carry no grade - that is what they have in
   * common - so the index answers for them by character rather than by number.
   */
  const covered = new Set([...byGrade.values()].flat());
  const rest = [...(await dictionaryCharacters())]
    .filter((character) => !covered.has(character))
    .sort((one, other) => one.codePointAt(0) - other.codePointAt(0));

  for (let at = 0; at < rest.length; at += OTHER_BUCKET_SIZE) {
    const bucket = Math.floor(at / OTHER_BUCKET_SIZE) + 1;
    await writeBucket(
      `other-${String(bucket).padStart(2, "0")}.json`,
      null,
      rest.slice(at, at + OTHER_BUCKET_SIZE),
    );
  }

  await fs.writeFile(
    path.join(OUT_DIR, "index.json"),
    `${JSON.stringify({ viewBox: "0 0 109 109", attribution: ATTRIBUTION, files: index }, null, 2)}\n`,
  );

  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`\nWrote ${written} characters. Missing from KanjiVG: ${missing}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
