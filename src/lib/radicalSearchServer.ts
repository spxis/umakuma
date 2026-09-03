import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getKanjiDictionaryEntry } from "./kanjiDictionary";
import { radicalsHref } from "./radicalBrowser";
import { radicalDisplayNames, resolveRadicalTokens } from "./radicalNames";
import {
  RADICAL_MATCH_LIMIT,
  kanjiForRadicals,
  orderChosen,
  radicalGroups,
  radicalsInKanji,
  usableRadicals,
  type RadicalEntry,
  type RadicalGroup,
} from "./radicalSearch";

/**
 * The radical index, read the way the dictionary is read.
 *
 * One 96KB file for 253 radicals and the 6,355 kanji they cover, so it is read
 * once and kept: the intersection is done here rather than in the browser
 * because shipping the whole map to every visitor would cost more than the
 * answers ever do.
 */
const DATA_FILE = path.join(process.cwd(), "src", "data", "radicals", "index.json");

type RadicalFile = {
  attribution: { source: string; publisher: string; url: string; licence: string; licenceUrl: string };
  radicals: RadicalEntry[];
};

let cached: RadicalFile | null = null;

function load(): RadicalFile {
  cached ??= (() => {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as RadicalFile;
    } catch {
      return { attribution: { source: "", publisher: "", url: "", licence: "", licenceUrl: "" }, radicals: [] };
    }
  })();
  return cached;
}

export type RadicalMatch = {
  kanji: string;
  meaning: string;
  strokeCount: number | null;
  /** Rank among the commonest 2,501; null past that. */
  frequencyRank: number | null;
};

export type RadicalSearchResult = {
  groups: RadicalGroup[];
  chosen: string[];
  /** Radicals that can still narrow what is left. Everything else is a dead end. */
  usable: string[];
  matches: RadicalMatch[];
  /** How many kanji match in total, which is not how many are returned. */
  totalMatches: number;
  attribution: RadicalFile["attribution"];
};

/**
 * Commonest first, then by stroke count.
 *
 * A radical pair can turn up two hundred characters, and the first screen
 * should hold the ones a reader will actually meet - the same order the stroke
 * browser uses, for the same reason.
 */
function byUsefulness(left: RadicalMatch, right: RadicalMatch): number {
  const leftRank = left.frequencyRank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.frequencyRank ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return (left.strokeCount ?? 99) - (right.strokeCount ?? 99) || left.kanji.localeCompare(right.kanji, "ja");
}

export async function runRadicalSearch(requested: readonly string[]): Promise<RadicalSearchResult> {
  const file = load();
  /* A name is resolved to its character before anything is intersected. */
  const named = await resolveRadicalTokens(requested, file.radicals.map((entry) => entry.radical));
  const chosen = orderChosen(file.radicals, named);
  const matched = kanjiForRadicals(file.radicals, chosen);

  /*
   * Only characters the dictionary knows: every match is a row that leads to a
   * page, and RADKFILE covers a few hundred the dictionary has no entry for.
   */
  const matches: RadicalMatch[] = [];
  for (const kanji of matched) {
    const entry = getKanjiDictionaryEntry(kanji);
    if (!entry) continue;
    matches.push({
      kanji,
      meaning: entry.primaryMeaning || entry.meanings[0] || "",
      strokeCount: entry.strokeCount,
      frequencyRank: entry.frequencyRank,
    });
  }
  matches.sort(byUsefulness);

  return {
    groups: radicalGroups(file.radicals),
    chosen,
    usable: [...usableRadicals(file.radicals, chosen)],
    matches: matches.slice(0, RADICAL_MATCH_LIMIT),
    totalMatches: matches.length,
    attribution: file.attribution,
  };
}

/** What the sources page reports about the radical index. */
export function radicalIndexSummary(): { radicalCount: number; kanjiCount: number } {
  const file = load();
  const kanji = new Set(file.radicals.flatMap((entry) => [...entry.kanji]));
  return { radicalCount: file.radicals.length, kanjiCount: kanji.size };
}

export type RadicalPart = {
  radical: string;
  strokes: number;
  /** What it is called in English, where anything names it. */
  name: string | null;
  /** The radicals page, opened on this part. */
  href: string;
};

/**
 * The parts a kanji is written with, for its own page.
 *
 * A kanji page says how the character is drawn and what it means but not what
 * it is made of, and RADKFILE knows that for 6,355 characters. Each part leads
 * to the radicals page opened on it, which answers the question a reader has
 * next - what else is written with this - and puts them somewhere they can
 * carry on looking. It used to hand them a search box primed with `:rad 水`,
 * which answers the same question and then leaves them inside a dropdown.
 *
 * Empty for a character RADKFILE does not cover, which the page reads as
 * nothing to show rather than as an error.
 */
export async function radicalPartsOf(kanji: string): Promise<RadicalPart[]> {
  const parts = radicalsInKanji(load().radicals, kanji);
  const names = await radicalDisplayNames(parts.map((entry) => entry.radical));
  return parts.map((entry) => ({
    radical: entry.radical,
    strokes: entry.strokes,
    name: names.get(entry.radical) ?? null,
    href: radicalsHref({ parts: [entry.radical] }),
  }));
}

/** The credit the parts block carries, since the data is EDRDG's not WaniKani's. */
export function radicalAttribution(): RadicalFile["attribution"] {
  return load().attribution;
}
