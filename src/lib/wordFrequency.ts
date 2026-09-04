import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * How common each word we teach actually is, and where that was measured.
 *
 * Two sources answer the question differently and both are needed. JMdict tags
 * entries by band in a newspaper corpus, which is the written register. Jiten
 * ranks by medium - anime, drama, film, novels, manga, games - which is what
 * people say and read for pleasure. A word everybody speaks and nobody prints
 * ranks nowhere in the first and highly in the second, so 父 and 雨 only look
 * rare if you ask one of them.
 *
 * Built by `pnpm build:word-frequency`. The file is read once and only its
 * summary is kept: the ranks themselves are several hundred kilobytes and the
 * pages that ask about the source do not need them.
 */
export type WordFrequencySummary = {
  generatedAt: string;
  /** How many words we teach. */
  words: number;
  /** How many got a blended rank from at least one corpus. */
  ranked: number;
  /** Every corpus consulted, newspaper first. */
  corpora: string[];
  /** How many of our words each corpus knows. */
  coverage: Record<string, number>;
  /** Upstream release identifiers, where a source publishes one. */
  versions: { jmdict: string | null };
};

const DATA_PATH = join(process.cwd(), "src/data/wordFrequency.json");

let cached: WordFrequencySummary | null | undefined;

/** The summary, read once per process. `null` when the file is absent. */
export function wordFrequencySummary(): WordFrequencySummary | null {
  if (cached !== undefined) return cached;
  try {
    const parsed = JSON.parse(readFileSync(DATA_PATH, "utf8")) as WordFrequencySummary;
    cached = {
      generatedAt: parsed.generatedAt,
      words: parsed.words,
      ranked: parsed.ranked,
      corpora: parsed.corpora ?? [],
      coverage: parsed.coverage ?? {},
      versions: parsed.versions ?? { jmdict: null },
    };
  } catch {
    cached = null;
  }
  return cached;
}

/** Drops the memo, so a rebuilt file is picked up without a restart. */
export function clearWordFrequencySummary(): void {
  cached = undefined;
}
