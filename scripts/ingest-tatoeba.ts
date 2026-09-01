/**
 * Ingests example sentences from Tatoeba.
 *
 * The site's example sentences come from WaniKani, so a member without a
 * WaniKani connection sees none at all - and standalone JLPT study, the grade
 * explorer and Practice have never had a sentence to show. Tatoeba publishes
 * its corpus weekly as plain exports, which is the supported way to take it;
 * nothing here scrapes anything.
 *
 * Source: https://tatoeba.org - the corpus is CC BY 2.0 FR, so the credit is a
 * licence condition. Each row keeps its Tatoeba id and contributor, which is
 * what lets a sentence link back to its page and name its author.
 *
 * Only Japanese sentences with an English translation are kept. Of 248,888
 * Japanese sentences, 232,731 have one; the rest would add 111 characters of
 * coverage, nearly all archaic variants like 國 and 奧, and no surface here can
 * use a sentence a reader cannot check the meaning of.
 *
 * Kana-only sentences are kept even though today's lookups - all of which find
 * a sentence by a kanji - cannot reach them. They are 2% of the corpus and the
 * only ones a kana vocabulary word could ever use.
 *
 * Usage:
 *   pnpm sentences:ingest --dry-run     report what would be written
 *   pnpm sentences:ingest               write it
 */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";

import { kanjiCost, kanjiIn, sentenceDifficulty } from "../src/lib/sentenceDifficulty";
import type { KanjiDictionaryEntry, KanjiDictionaryIndex } from "../src/lib/kanjiDictionary.types";

const run = promisify(execFile);
const prisma = new PrismaClient();

const EXPORTS = "https://downloads.tatoeba.org/exports/per_language";
const FILES = {
  japanese: `${EXPORTS}/jpn/jpn_sentences_detailed.tsv.bz2`,
  english: `${EXPORTS}/eng/eng_sentences.tsv.bz2`,
  links: `${EXPORTS}/jpn/jpn-eng_links.tsv.bz2`,
};

/** Rows per insert. Large enough to be quick, small enough to stay under limits. */
const BATCH = 2_000;

const dryRun = process.argv.includes("--dry-run");
const cacheDir = process.env.TATOEBA_CACHE ?? path.join(os.tmpdir(), "umakuma-tatoeba");

/** Downloads once and keeps it, so a re-run costs nothing. */
async function fetchExport(name: string, url: string): Promise<string> {
  await fs.mkdir(cacheDir, { recursive: true });
  const archive = path.join(cacheDir, `${name}.tsv.bz2`);

  try {
    await fs.access(archive);
  } catch {
    console.log(`Downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${name} download failed: ${response.status}`);
    await fs.writeFile(archive, Buffer.from(await response.arrayBuffer()));
  }

  /* Node has gzip and brotli but no bzip2, so this shells out the way the
   * KanjiVG build shells out to tar. */
  const { stdout } = await run("bzip2", ["-dc", archive], { maxBuffer: 1024 * 1024 * 1024 });
  return stdout;
}

/** The dictionary we ship, as the cost of each character. */
async function kanjiCosts(): Promise<Map<string, number>> {
  const dir = path.join(process.cwd(), "src", "data", "kanjidic");
  const index = JSON.parse(await fs.readFile(path.join(dir, "index.json"), "utf8")) as KanjiDictionaryIndex;

  const costs = new Map<string, number>();
  for (const file of index.files) {
    const parsed = JSON.parse(await fs.readFile(path.join(dir, file.file), "utf8")) as {
      kanji: KanjiDictionaryEntry[];
    };
    for (const entry of parsed.kanji) {
      costs.set(entry.kanji, kanjiCost(entry));
    }
  }
  return costs;
}

type Row = {
  id: number;
  japanese: string;
  english: string;
  kanji: string[];
  difficulty: number;
  owner: string | null;
};

async function build(): Promise<Row[]> {
  const costs = await kanjiCosts();

  const japanese = new Map<number, { text: string; owner: string | null }>();
  for (const line of (await fetchExport("jpn_detailed", FILES.japanese)).split("\n")) {
    const [id, , text, username] = line.split("\t");
    if (!id || !text) continue;
    japanese.set(Number(id), { text, owner: username && username !== "\\N" ? username : null });
  }

  const english = new Map<number, string>();
  for (const line of (await fetchExport("eng", FILES.english)).split("\n")) {
    const [id, , text] = line.split("\t");
    if (!id || !text) continue;
    english.set(Number(id), text);
  }

  /*
   * A sentence often has several translations. The shortest is the one to
   * keep: they are alternative phrasings of the same Japanese, and the
   * shortest is the one a learner checks their understanding against fastest.
   */
  const chosen = new Map<number, string>();
  for (const line of (await fetchExport("links", FILES.links)).split("\n")) {
    const [from, to] = line.split("\t");
    if (!from || !to) continue;
    const translation = english.get(Number(to));
    if (!translation) continue;
    const current = chosen.get(Number(from));
    if (!current || translation.length < current.length) chosen.set(Number(from), translation);
  }

  const rows: Row[] = [];
  let withoutKanji = 0;
  let withEnglish = 0;
  for (const [id, sentence] of japanese) {
    const translation = chosen.get(id);
    if (!translation) continue;
    withEnglish += 1;
    /* Only characters the dictionary knows, so the index holds nothing unusable. */
    const characters = kanjiIn(sentence.text).filter((character) => costs.has(character));
    /*
     * Kana-only sentences are kept even though nothing can look them up today.
     * Every lookup here finds a sentence by a kanji, so these are unreachable
     * for now - but they are 2% of the corpus and they are exactly what a kana
     * vocabulary word (これ, ありがとう) would need if examples ever reach
     * vocabulary. Dropping them is reversible only by a full re-ingest;
     * keeping them costs almost nothing. See docs/BACKLOG.md.
     */
    if (characters.length === 0) withoutKanji += 1;
    rows.push({
      id,
      japanese: sentence.text,
      english: translation,
      kanji: characters,
      difficulty: sentenceDifficulty(sentence.text, costs),
      owner: sentence.owner,
    });
  }

  console.log(`Japanese sentences   : ${japanese.size.toLocaleString("en-CA")}`);
  console.log(`with an English pair : ${withEnglish.toLocaleString("en-CA")}`);
  console.log(`of those, no kanji   : ${withoutKanji.toLocaleString("en-CA")} (kept; unreachable until vocabulary lookups exist)`);
  console.log(`kept                 : ${rows.length.toLocaleString("en-CA")}`);
  console.log(`characters covered   : ${new Set(rows.flatMap((row) => row.kanji)).size.toLocaleString("en-CA")}`);

  return rows;
}

async function main() {
  const rows = await build();
  /* What a reader would actually be shown, which is the only ordering that matters. */
  for (const character of ["水", "鬱", "私"]) {
    const examples = rows
      .filter((row) => row.kanji.includes(character))
      .sort((left, right) => left.difficulty - right.difficulty)
      .slice(0, 3);
    console.log(`\nexamples for ${character} (${rows.filter((row) => row.kanji.includes(character)).length} available):`);
    for (const row of examples) console.log(`   [${row.difficulty}] ${row.japanese}  -  ${row.english}`);
  }

  if (dryRun) {
    console.log("\nDry run: nothing was written.");
    return;
  }

  console.log(`\nWriting ${rows.length.toLocaleString("en-CA")} sentences…`);
  await prisma.tatoebaSentence.deleteMany();
  for (let index = 0; index < rows.length; index += BATCH) {
    await prisma.tatoebaSentence.createMany({
      data: rows.slice(index, index + BATCH),
      skipDuplicates: true,
    });
    if (index % (BATCH * 10) === 0) {
      console.log(`  ${index.toLocaleString("en-CA")} / ${rows.length.toLocaleString("en-CA")}`);
    }
  }
  console.log(`Wrote ${await prisma.tatoebaSentence.count()} sentences.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
