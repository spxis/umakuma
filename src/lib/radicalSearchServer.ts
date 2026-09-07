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
  /** How many the parts alone match, before any stroke count narrowed them. */
  poolMatches: number;
  /**
   * The stroke counts the answers actually take, with how many take each.
   *
   * The second filter on this page, and the mirror of the parts filter on the
   * stroke pages: every count offered has kanji behind it, because it was
   * counted from the answers rather than from the dictionary.
   */
  strokeChoices: { strokes: number; count: number }[];
  /** The count a reader narrowed to, or null for all of them. */
  strokes: number | null;
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

export async function runRadicalSearch(
  requested: readonly string[],
  options: { strokes?: number | null } = {},
): Promise<RadicalSearchResult> {
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

  /*
   * Counted before the count is applied, so a chip says how many it would
   * leave rather than how many are left. John, asking for this half after the
   * parts filter on the stroke pages: "do the same for the Radicals viewer!
   * Add a stroke filter that can further help reduce the number of kanji you
   * see."
   */
  const tally = new Map<number, number>();
  for (const match of matches) {
    if (match.strokeCount === null) continue;
    tally.set(match.strokeCount, (tally.get(match.strokeCount) ?? 0) + 1);
  }
  const strokeChoices = [...tally.entries()]
    .map(([strokes, count]) => ({ strokes, count }))
    .sort((left, right) => left.strokes - right.strokes);

  /* A count nothing takes is not offered, so this can only ever narrow. */
  const strokes = strokeChoices.some((choice) => choice.strokes === options.strokes)
    ? (options.strokes as number)
    : null;
  const kept = strokes === null ? matches : matches.filter((match) => match.strokeCount === strokes);

  /*
   * Measured against what the stroke count left, so the two filters narrow
   * each other rather than each pretending the other is not there. With
   * nothing picked at all, `usableRadicals` answers over the whole index,
   * which is the plain page: everything is still a live question.
   */
  const usable =
    chosen.length === 0
      ? usableRadicals(file.radicals, chosen)
      : presentRadicals(file.radicals, new Set(kept.map((match) => match.kanji)), chosen);

  return {
    groups: radicalGroups(file.radicals),
    chosen,
    usable: [...usable],
    matches: kept.slice(0, RADICAL_MATCH_LIMIT),
    totalMatches: kept.length,
    /** Before the stroke count was applied, for the line that says "7 of 21". */
    poolMatches: matches.length,
    strokeChoices,
    strokes,
    attribution: file.attribution,
  };
}

/**
 * The radicals present in a set of kanji, plus the ones already chosen.
 *
 * The promise both pages make: nothing offered can return nothing. That is
 * only true if it is measured against what is actually left after every other
 * filter - the stroke count as well as the parts - so both callers hand in
 * the kanji that survive and ask this the same question.
 *
 * The chosen ones stay in the answer however far the pool has narrowed:
 * taking one back must always be possible.
 */
function presentRadicals(
  entries: readonly RadicalEntry[],
  remaining: ReadonlySet<string>,
  chosen: readonly string[],
): Set<string> {
  const present = new Set(chosen);
  for (const entry of entries) {
    if (present.has(entry.radical)) continue;
    for (const kanji of entry.kanji) {
      if (remaining.has(kanji)) {
        present.add(entry.radical);
        break;
      }
    }
  }
  return present;
}

/**
 * A second filter over a page that already has one.
 *
 * The stroke pages hold up to nine hundred kanji at one count, which is a
 * page to scroll rather than a page to read. John, looking at 17 strokes:
 * "we have a massive amount of results still... this will be great if
 * browsing kanji and you wanted to find all the 17 stroke kanji with a MOUTH
 * radical."
 *
 * The pool comes in from whatever the page already narrowed to - the stroke
 * count, common-only, both - and everything here is computed against that,
 * which is the whole promise: **nothing offered can return nothing.** A
 * radical in none of those forty-nine kanji is a dead end whether or not it
 * is a dead end in the dictionary at large.
 *
 * Chosen radicals stay usable however far the pool has narrowed. Taking one
 * back must always be possible - the same rule `usableRadicals` keeps.
 */
export function narrowByRadicals(
  pool: readonly string[],
  requested: readonly string[],
): { chosen: string[]; kept: string[]; usable: Set<string>; groups: RadicalGroup[] } {
  const file = load();
  const chosen = orderChosen(file.radicals, requested);
  const matched = chosen.length > 0 ? new Set(kanjiForRadicals(file.radicals, chosen)) : null;
  const kept = matched ? pool.filter((kanji) => matched.has(kanji)) : [...pool];

  const usable = presentRadicals(file.radicals, new Set(kept), chosen);

  return { chosen, kept, usable, groups: radicalGroups(file.radicals) };
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
