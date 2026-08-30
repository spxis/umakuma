#!/usr/bin/env node
/**
 * Builds the official reading list from the 常用漢字表.
 *
 * The school-grade data carries KANJIDIC's exhaustive readings, which is a
 * dictionary's job rather than a curriculum's: it lists every reading a
 * character has ever taken, including compound-only forms. That is how 王 came
 * to show a kun reading of のう, which only exists inside a word like 親王.
 *
 * The 常用漢字表 is the Cabinet-notified list of readings for general use, so it
 * is both shorter and authoritative. It also settles the on/kun split by script:
 * on-yomi is written in katakana, kun-yomi in hiragana, which is why 音's イン
 * lands as an on reading here and was a kun reading before.
 *
 * Source: mimneko/kanji-data (CC0, public domain), transcribing 文化庁's
 * 常用漢字表（平成22年内閣告示第2号）. Pinned to a commit so a rebuild is
 * reproducible, like `map:build` and `strokes:build`.
 *
 * Usage: pnpm readings:build
 */

import fs from "node:fs/promises";
import path from "node:path";

const DATA_COMMIT = "0be3577f7939ec85d2b4e373a7a94262e7449e13";
const SOURCE_URL = `https://raw.githubusercontent.com/mimneko/kanji-data/${DATA_COMMIT}/%E5%B8%B8%E7%94%A8%E6%BC%A2%E5%AD%97%E8%A1%A8%E6%9C%AC%E8%A1%A8.json`;
const OUT_FILE = path.join(process.cwd(), "src", "data", "joyo-readings.json");

const ATTRIBUTION = {
  source: "常用漢字表 (Jōyō kanji table)",
  authority: "文化庁 — Agency for Cultural Affairs, Japan",
  notification: "平成22年内閣告示第2号",
  via: "mimneko/kanji-data",
  viaUrl: "https://github.com/mimneko/kanji-data",
  licence: "CC0 1.0",
  commit: DATA_COMMIT,
};

/** Katakana marks an on reading; hiragana a kun one. That is the table's own convention. */
function isOnReading(reading) {
  return /^[ァ-ヶー]/.test(reading);
}

async function main() {
  process.stdout.write(`Fetching 常用漢字表 @ ${DATA_COMMIT.slice(0, 7)}... `);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const raw = await response.json();
  console.log("done");

  const rows = Array.isArray(raw) ? raw : Object.values(raw)[0];
  const entries = [];

  for (const row of rows) {
    const kanji = row?.漢字?.通用字体;
    if (typeof kanji !== "string" || kanji.length === 0) {
      continue;
    }

    const on = [];
    const kun = [];
    const examples = {};

    for (const item of row.音訓 ?? []) {
      const reading = item?.読み;
      if (typeof reading !== "string" || reading.length === 0) {
        continue;
      }

      (isOnReading(reading) ? on : kun).push(reading);
      const words = (item.例 ?? []).filter((word) => typeof word === "string");
      if (words.length > 0) {
        examples[reading] = words;
      }
    }

    entries.push({ kanji, on, kun, examples });
  }

  entries.sort((left, right) => left.kanji.localeCompare(right.kanji, "ja"));

  await fs.writeFile(
    OUT_FILE,
    `${JSON.stringify({ attribution: ATTRIBUTION, count: entries.length, kanji: entries }, null, 2)}\n`,
  );

  const withKun = entries.filter((entry) => entry.kun.length > 0).length;
  console.log(`Wrote ${entries.length} characters to src/data/joyo-readings.json`);
  console.log(`  with at least one kun reading: ${withKun}`);
  console.log(`  on-only (like 王): ${entries.length - withKun}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
