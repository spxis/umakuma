import type { Article } from "./articles.types";
import { WORDS_PER_MINUTE } from "./Articles.constants";
import SearchDictionarySentences from "./content/SearchDictionarySentences";

/**
 * Every article, newest first.
 *
 * One list, because an article that is not in it does not exist: there is no
 * directory scan and no database, so adding one is an edit a reviewer sees.
 */
export const ARTICLES: Article[] = [
  {
    slug: "search-dictionary-sentences",
    title: "Search, Dictionary, Sentences",
    summary:
      "Fourteen releases across search, the KANJIDIC2 import and Tatoeba sentences — and the measurements that corrected three assumptions along the way.",
    publishedAt: "2026-09-01",
    words: 1120,
    Body: SearchDictionarySentences,
  },
];

/** Newest first, which is the order they are read in. */
export function listArticles(): Article[] {
  return [...ARTICLES].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export function findArticle(slug: string): Article | null {
  return ARTICLES.find((article) => article.slug === slug) ?? null;
}

/** Rounded up, and never zero: "0 min read" reads as broken. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
