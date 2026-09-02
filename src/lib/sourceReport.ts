import type { SourceKey } from "./sourceCredits";

/**
 * What we hold from one source, said in numbers.
 *
 * The page a credit links to answers three questions a reader might have about
 * a borrowed fact: how much of it we have, when it was last brought in, and
 * which release of theirs it came from. This is that answer as data; the
 * server assembles it from the tables and indexes, the page draws it.
 *
 * Pure, so the freshness wording can be tested against fixed clocks.
 */
export type SourceCount = {
  label: string;
  value: number;
};

export type SourceReport = {
  key: SourceKey;
  counts: SourceCount[];
  /** ISO instant of the last import, or null where nothing is stamped. */
  lastImportedAt: string | null;
  /** The source's own release identifier, where it publishes one. */
  version: string | null;
  /** When this report was assembled, so freshness is judged against one clock. */
  generatedAtMs: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long ago an import was, in words a reader can weigh.
 *
 * "Today" and "yesterday" rather than "0 days ago"; whole days after that;
 * months once days stop meaning anything. A source that has never been
 * stamped says so rather than pretending to a date.
 */
export function describeFreshness(lastImportedAt: string | null, nowMs: number): string {
  if (!lastImportedAt) return "not recorded";
  const then = Date.parse(lastImportedAt);
  if (Number.isNaN(then)) return "not recorded";

  const days = Math.floor((nowMs - then) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}

/** Thousands separated, the way every other count on the site is written. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-CA").format(value);
}
