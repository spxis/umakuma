#!/usr/bin/env node
/**
 * Builds the radical index from RADKFILE.
 *
 * Looking a kanji up by its parts is how you find one you cannot read: you
 * cannot type it and you do not know its readings, but you can see that it has
 * 水 on the left and 田 on the right. Jisho, WWWJDIC and every paper dictionary
 * before them work this way.
 *
 * The radicals are the classical set - 253 of them, the elements Michael Raine
 * identified across the JIS1/2 kanji - not WaniKani's invented ones. WaniKani's
 * radicals exist to teach mnemonics for the two thousand kanji it covers and
 * are named for what they look like ("gun", "leaf"); they are not what anyone
 * else means by a radical, and three quarters of the dictionary has none.
 *
 * Source: http://www.edrdg.org/krad/kradinf.html - Michael Raine, James Breen
 * and the Electronic Dictionary Research and Development Group, Creative
 * Commons Attribution-Share Alike 4.0. The attribution rides in the generated
 * file and is shown to the reader, and the generated data carries the same
 * licence, which is what share-alike asks for.
 *
 * The whole file is 56KB of EUC-JP and comes out around 90KB of JSON, so it is
 * one file rather than the grade-by-grade split the dictionary needs.
 *
 * Usage: pnpm radicals:build
 */

import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const SOURCE_URL = "http://ftp.edrdg.org/pub/Nihongo/radkfile.gz";
const OUT_DIR = path.join(process.cwd(), "src", "data", "radicals");
const OUT_FILE = "index.json";

const ATTRIBUTION = {
  source: "RADKFILE",
  publisher: "Michael Raine, James Breen and the Electronic Dictionary Research and Development Group",
  url: "http://www.edrdg.org/krad/kradinf.html",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};

async function main() {
  console.log(`Fetching ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`RADKFILE fetch failed: ${response.status}`);
  }

  /* EUC-JP, not UTF-8: the file predates it and is still published that way. */
  const text = new TextDecoder("euc-jp").decode(gunzipSync(new Uint8Array(await response.arrayBuffer())));

  const radicals = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("#") || line.trim() === "") continue;

    if (line.startsWith("$")) {
      /* `$ <radical> <strokes>`, and for a display variant a JIS code we do not need. */
      const [, radical, strokes] = line.split(/\s+/);
      current = { radical, strokes: Number(strokes), kanji: "" };
      radicals.push(current);
      continue;
    }

    if (current) current.kanji += line.trim();
  }

  if (radicals.length === 0) {
    throw new Error("RADKFILE parsed to nothing - the format may have changed");
  }

  radicals.sort((left, right) => left.strokes - right.strokes || left.radical.localeCompare(right.radical, "ja"));

  const covered = new Set(radicals.flatMap((entry) => [...entry.kanji]));
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(OUT_DIR, OUT_FILE),
    `${JSON.stringify({ attribution: ATTRIBUTION, radicals }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Wrote ${radicals.length} radicals covering ${covered.size} kanji to ${path.join(OUT_DIR, OUT_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
