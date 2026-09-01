import "server-only";

import { prisma } from "./prisma";

/**
 * Example sentences, easiest first.
 *
 * The site's own examples come from WaniKani, so a member without a WaniKani
 * connection has never seen one. These come from Tatoeba's weekly export and
 * belong to nobody's account, so every surface can show them - the kanji page,
 * the explorers, Practice - whoever is reading.
 *
 * The order is the whole point. 水 appears in 1,645 of these, and handing a
 * first-grader whichever one the database returned first is how a lookup
 * becomes discouraging; `difficulty` was scored at ingest so the shortest
 * sentence built from the simplest characters comes back first.
 */

/** Credit is a licence condition of CC BY, not decoration. */
export const TATOEBA_ATTRIBUTION = {
  source: "Tatoeba",
  url: "https://tatoeba.org",
  licence: "CC BY 2.0 FR",
  licenceUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
} as const;

/** How many examples a surface shows before it becomes a reading list. */
export const SENTENCE_LIMIT = 3;
export const SENTENCE_MAX_LIMIT = 12;

export type ExampleSentence = {
  id: number;
  japanese: string;
  english: string;
  /** The contributor who wrote it, when Tatoeba records one. */
  owner: string | null;
  /** Where the sentence lives, so a reader can see it in context. */
  href: string;
};

/** Where one sentence can be read on Tatoeba, for the credit and for curiosity. */
export function sentenceHref(id: number): string {
  return `${TATOEBA_ATTRIBUTION.url}/sentences/show/${id}`;
}

/**
 * The sentence stripped to what it says, for spotting repeats.
 *
 * Tatoeba holds "水をくれ！" and "水をくれ。" as separate contributions, and
 * both score identically, so a page showing three examples spent two of them
 * on the same sentence. Punctuation is the only difference that matters here.
 */
export function sentenceShape(japanese: string): string {
  return japanese.replace(/[。、！？!?,.\s・]/g, "");
}

/** The distinct ones, keeping the easiest phrasing of each repeat. */
export function dedupeSentences<T extends { japanese: string }>(sentences: T[], limit: number): T[] {
  const kept: T[] = [];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    const shape = sentenceShape(sentence.japanese);
    if (seen.has(shape)) continue;
    seen.add(shape);
    kept.push(sentence);
    if (kept.length >= limit) break;
  }
  return kept;
}

/**
 * The easiest examples containing that character.
 *
 * A GIN index on the kanji array is what makes this a lookup rather than a
 * scan of a quarter of a million rows. A failure returns nothing rather than
 * throwing: a page that came for a kanji should still render without its
 * examples.
 */
export async function fetchSentencesForKanji(
  character: string,
  limit: number = SENTENCE_LIMIT,
): Promise<ExampleSentence[]> {
  if (!character) return [];

  const wanted = Math.min(Math.max(limit, 1), SENTENCE_MAX_LIMIT);

  try {
    const rows = await prisma.tatoebaSentence.findMany({
      where: { kanji: { has: character } },
      orderBy: [{ difficulty: "asc" }, { id: "asc" }],
      /* Extra, because near-repeats are dropped after the sort, not before it. */
      take: wanted * 4,
      select: { id: true, japanese: true, english: true, owner: true },
    });

    return dedupeSentences(rows, wanted).map((row) => ({ ...row, href: sentenceHref(row.id) }));
  } catch (error) {
    console.error("sentence lookup failed", error);
    return [];
  }
}
