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
const WK_DIR = path.join(process.cwd(), "src", "data", "wk-catalog-levels");

const ATTRIBUTION = {
  source: "KanjiVG",
  url: "https://kanjivg.tagaini.net",
  licence: "CC BY-SA 3.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  commit: KANJIVG_COMMIT,
};

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
 * Characters the live catalogue teaches that the committed level export does
 * not yet list.
 *
 * `src/data/wk-catalog-levels` is a snapshot, and WaniKani has added kanji
 * since it was taken, so these thirteen were silently missing stroke order
 * while KanjiVG had every one of them. Regenerating that export with
 * `export-wk-catalog-level-json` should make this list redundant; until then
 * it is better to name them than to quietly ship gaps.
 */
const CATALOG_BEYOND_EXPORT = ["嘘", "叩", "飴", "鮭", "噛", "咳", "屁", "痒", "繋", "炒", "舐", "騙", "壺"];

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

  for (const kanji of CATALOG_BEYOND_EXPORT) {
    if (!alreadyCovered.has(kanji)) {
      extras.add(kanji);
    }
  }

  return extras;
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

  for (const [grade, characters] of [...byGrade.entries()].sort((a, b) => a[0] - b[0])) {
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

    const outFile = `grade-${String(grade).padStart(2, "0")}.json`;
    await fs.writeFile(
      path.join(OUT_DIR, outFile),
      `${JSON.stringify({ grade, viewBox: "0 0 109 109", attribution: ATTRIBUTION, kanji: entries }, null, 2)}\n`,
    );
    index.push({ grade, file: outFile, count: entries.length });
    console.log(`  grade ${grade}: ${entries.length} characters -> ${outFile}`);
  }

  await fs.writeFile(
    path.join(OUT_DIR, "index.json"),
    `${JSON.stringify({ viewBox: "0 0 109 109", attribution: ATTRIBUTION, grades: index }, null, 2)}\n`,
  );

  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`\nWrote ${written} characters. Missing from KanjiVG: ${missing}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
