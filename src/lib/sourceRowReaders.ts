import "server-only";

import fs from "node:fs";
import path from "node:path";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import { getAllKanjiDictionaryEntries } from "./kanjiDictionary";
import { prisma } from "./prisma";
import { getAllSchoolGradeKanji } from "./schoolGrades";
import type { ShowcaseRow } from "./sourceShowcase";

/**
 * Every source, read as rows an admin can look through and pick from.
 *
 * Twelve sources with nothing in common: a radical index keyed by glyph, a
 * quarter of a million sentence pairs in Postgres, eleven frequency corpora in
 * one JSON file, three maps of regions. What they share is the shape the
 * showcase needs - a specimen and a line about it - so each reader's whole job
 * is to say what one row of its source looks like in that shape, and the
 * paging and searching above it is written once.
 *
 * The detail lines here are the same sentences the public card draws, which is
 * the point: an admin picks a row and gets the figure the data actually holds,
 * rather than typing a number that was true when they looked it up.
 */

const DATA_DIR = path.resolve(process.cwd(), "src/data");

function readJson<T>(relative: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, relative), "utf8")) as T;
}

/**
 * "1 strokes" is the kind of wrong that survives a review and then sits on a
 * public page crediting somebody else's work, so counting words are written
 * once. `一` is one stroke; Hokkaido has no land borders, not 0.
 */
function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-CA")} ${count === 1 ? one : many}`;
}

/** How many rows a browse request will ever build in memory at once. */
export const ROW_SCAN_LIMIT = 5_000;

export async function wanikaniRows(): Promise<ShowcaseRow[]> {
  const subjects = await prisma.wkSubjectCatalog.findMany({
    where: { hiddenAt: null, characters: { not: null } },
    select: { characters: true, level: true, subjectType: true, meanings: true },
    orderBy: [{ level: "asc" }, { wkSubjectId: "asc" }],
    take: ROW_SCAN_LIMIT,
  });
  return subjects.flatMap((subject) => {
    if (!subject.characters) return [];
    const meanings = subject.meanings as { meaning?: string; primary?: boolean }[] | null;
    const primary = meanings?.find((entry) => entry.primary)?.meaning ?? "";
    return [{ specimen: subject.characters, detail: `Level ${subject.level} · ${primary.toLowerCase()}` }];
  });
}

export function kanjidic2Rows(): ShowcaseRow[] {
  return getAllKanjiDictionaryEntries()
    .filter((entry) => entry.strokeCount !== null)
    .map((entry) => ({
      specimen: entry.kanji,
      detail: `${plural(entry.strokeCount as number, "stroke", "strokes")} · ${entry.primaryMeaning}${
        entry.frequencyRank ? ` · frequency rank ${entry.frequencyRank.toLocaleString("en-CA")}` : ""
      }`,
    }));
}

type RadicalFile = { radicals: { radical: string; strokes: number; kanji: string }[] };

export function radkfileRows(): ShowcaseRow[] {
  return readJson<RadicalFile>("radicals/index.json").radicals.map((entry) => ({
    specimen: entry.radical,
    detail: `${plural(entry.strokes, "stroke", "strokes")} · in ${plural([...entry.kanji].length, "character", "characters")}`,
  }));
}

type StrokeFile = { kanji: { kanji: string; strokes: unknown[] }[] };

export function kanjivgRows(): ShowcaseRow[] {
  const dir = path.join(DATA_DIR, "stroke-order");
  const rows: ShowcaseRow[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (file === "index.json") continue;
    for (const entry of readJson<StrokeFile>(path.join("stroke-order", file)).kanji) {
      rows.push({ specimen: entry.kanji, detail: `${plural(entry.strokes.length, "stroke", "strokes")}, drawn in order` });
    }
  }
  return rows;
}

export async function kanjiapiRows(): Promise<ShowcaseRow[]> {
  const rows = await prisma.jlptKanji.findMany({
    select: { character: true, nLevel: true, meanings: true },
    orderBy: [{ nLevel: "desc" }, { character: "asc" }],
    take: ROW_SCAN_LIMIT,
  });
  return rows.map((row) => {
    const meanings = Array.isArray(row.meanings) ? (row.meanings as unknown[]) : [];
    const said = meanings.filter((m): m is string => typeof m === "string").slice(0, 2).join(", ");
    return { specimen: row.character, detail: `N${row.nLevel}${said ? ` · ${said}` : ""}` };
  });
}

export async function tatoebaRows(): Promise<ShowcaseRow[]> {
  const rows = await prisma.tatoebaSentence.findMany({
    select: { japanese: true, english: true },
    orderBy: { id: "asc" },
    take: ROW_SCAN_LIMIT,
  });
  return rows.map((row) => ({ specimen: row.japanese, detail: row.english }));
}

type FrequencyFile = {
  detail: Record<string, { newspaper: number | null; anime: number | null; global: number | null }>;
};

/** Ranks come straight off the file; the memoised summary throws them away. */
function wordRows(): { word: string; id: string; newspaper: number | null; anime: number | null }[] {
  const frequency = readJson<FrequencyFile>("wordFrequency.json");
  const index = readJson<{ files: string[] }>("wk-catalog-levels/index.json");
  const rows: { word: string; id: string; newspaper: number | null; anime: number | null }[] = [];
  for (const file of index.files) {
    const level = readJson<{ vocabulary?: { characters: string | null; wkSubjectId: number; hiddenAt: string | null }[] }>(
      path.join("wk-catalog-levels", file),
    );
    for (const subject of level.vocabulary ?? []) {
      if (!subject.characters || subject.hiddenAt) continue;
      const found = frequency.detail[String(subject.wkSubjectId)];
      if (!found) continue;
      rows.push({ word: subject.characters, id: String(subject.wkSubjectId), ...found });
    }
  }
  return rows;
}

/** JMdict publishes bands of 500, not ranks, so a row says which band. */
function bandOf(rank: number): number {
  return (rank - 250) / 500 + 1;
}

export function jmdictRows(): ShowcaseRow[] {
  return wordRows()
    .filter((row) => row.newspaper !== null)
    .sort((left, right) => (left.newspaper ?? 0) - (right.newspaper ?? 0))
    .map((row) => ({
      specimen: row.word,
      detail: `Band ${bandOf(row.newspaper as number)} of 48 in print`,
    }));
}

export function jitenRows(): ShowcaseRow[] {
  return wordRows()
    .filter((row) => row.anime !== null)
    .sort((left, right) => (left.anime ?? 0) - (right.anime ?? 0))
    .map((row) => ({
      specimen: row.word,
      detail: `Rank ${(row.anime as number).toLocaleString("en-CA")} in anime${
        row.newspaper !== null ? ` · band ${bandOf(row.newspaper)} of 48 in print` : ""
      }`,
    }));
}

export function curriculumRows(): ShowcaseRow[] {
  return getAllSchoolGradeKanji().map((entry) => ({
    specimen: entry.kanji,
    detail: `${entry.category.name}${entry.grade <= 6 ? ` · grade ${entry.grade}` : ""}${
      entry.frequencyRank ? ` · frequency rank ${entry.frequencyRank.toLocaleString("en-CA")}` : ""
    }`,
  }));
}

/**
 * A region and how many others it touches, which is the fact the map's own
 * accreditation counts and the only one a reader can check by looking.
 */
export function mapRows(country: CountryCode): ShowcaseRow[] {
  return GEO_DATASETS[country].regions.map((region) => {
    const borders = region.map.neighbors.length;
    return {
      /* Japan's prefectures carry their written name; the rest are English. */
      specimen: region.nameNative ?? region.name,
      detail: borders === 0 ? "No land borders" : plural(borders, "land border", "land borders"),
    };
  });
}
