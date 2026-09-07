import { gradePlacement } from "@/lib/gradeLadder";
import { kanjiPlacement } from "@/lib/kanjiLadder";
import { LEVEL_SYSTEMS } from "@/lib/levelBadge";

/**
 * "Only the ones I need to know", on a page of several hundred kanji.
 *
 * John, on a stroke count holding 226: "useful for someone browsing all kanji
 * and wanting to get rid of things they don't need to recognize/know."
 *
 * Each of these asks a different list whether it teaches the character, and
 * the lists are not nested: WaniKani teaches past jōyō, the JLPT skips 227
 * characters our own ladder carries, and a school year is a different
 * ordering of nearly the same set. So they are separate questions and a
 * reader may ask several at once.
 *
 * The prefixes are `levelBadge`'s, because a member already reads `WK` and
 * `UN` on every chip on the page - a filter that spelled them differently
 * would be a second name for the same ladder.
 */
export const KANJI_SOURCES = {
  /** Ranked among the 2,501 commonest in newspapers. */
  common: "common",
  jlpt: "jlpt",
  wanikani: "wk",
  umakuma: "un",
  umakumaGrade: "ug",
} as const;

export type KanjiSource = (typeof KANJI_SOURCES)[keyof typeof KANJI_SOURCES];

export const KANJI_SOURCE_VALUES: readonly KanjiSource[] = Object.values(KANJI_SOURCES);

export const KANJI_SOURCE_DISPLAY: Record<KanjiSource, { label: string; title: string }> = {
  [KANJI_SOURCES.common]: {
    label: "Common",
    title: "Among the 2,500 commonest characters in newspapers.",
  },
  [KANJI_SOURCES.jlpt]: {
    label: "JLPT",
    title: "On a JLPT list.",
  },
  [KANJI_SOURCES.wanikani]: {
    label: LEVEL_SYSTEMS.wanikani,
    title: "Taught by WaniKani.",
  },
  [KANJI_SOURCES.umakuma]: {
    label: LEVEL_SYSTEMS.umakuma,
    title: "On the UmaKuma ladder, ordered by the exam.",
  },
  [KANJI_SOURCES.umakumaGrade]: {
    label: LEVEL_SYSTEMS.umakumaGrade,
    title: "On the UmaKuma ladder, ordered by Japanese school year.",
  },
};

/** What a page knows about a character before any list is asked. */
export type SourceCandidate = { kanji: string; frequencyRank: number | null };

export function matchesSource(candidate: SourceCandidate, source: KanjiSource): boolean {
  switch (source) {
    case KANJI_SOURCES.common:
      return candidate.frequencyRank !== null;
    case KANJI_SOURCES.jlpt:
      return kanjiPlacement(candidate.kanji)?.nLevel != null;
    case KANJI_SOURCES.wanikani:
      return kanjiPlacement(candidate.kanji)?.waniKaniLevel != null;
    case KANJI_SOURCES.umakuma:
      return kanjiPlacement(candidate.kanji) !== null;
    case KANJI_SOURCES.umakumaGrade:
      return gradePlacement(candidate.kanji) !== null;
    default:
      return true;
  }
}

/**
 * The characters that pass every filter asked for, and what each one is worth.
 *
 * The counts are measured against the *other* filters, the way the parts grid
 * and the stroke chips already are: a chip says how many it would leave from
 * here, so nothing offered can empty the page and no number on screen is
 * about a set the reader is not looking at.
 */
export function narrowBySources<T extends SourceCandidate>(
  pool: readonly T[],
  chosen: readonly KanjiSource[],
): { kept: T[]; counts: Record<KanjiSource, number> } {
  const kept = pool.filter((candidate) => chosen.every((source) => matchesSource(candidate, source)));

  const counts = {} as Record<KanjiSource, number>;
  for (const source of KANJI_SOURCE_VALUES) {
    /* What this chip would leave: everything else still applied, this one
       swapped in or out. */
    const others = chosen.filter((value) => value !== source);
    const rest = pool.filter((candidate) => others.every((value) => matchesSource(candidate, value)));
    counts[source] = chosen.includes(source)
      ? kept.length
      : rest.filter((candidate) => matchesSource(candidate, source)).length;
  }

  return { kept, counts };
}

/** The filters an address names, in the order the page lists them. */
export function readSources(value: string | string[] | undefined): KanjiSource[] {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return [];

  const asked = new Set(first.split(",").map((part) => part.trim()));
  return KANJI_SOURCE_VALUES.filter((source) => asked.has(source));
}

/** How the address spells them back. */
export function writeSources(sources: readonly KanjiSource[]): string {
  return KANJI_SOURCE_VALUES.filter((source) => sources.includes(source)).join(",");
}

/** Adding or removing one, which is what clicking a chip does. */
export function toggleSource(sources: readonly KanjiSource[], source: KanjiSource): KanjiSource[] {
  return sources.includes(source) ? sources.filter((value) => value !== source) : [...sources, source];
}
