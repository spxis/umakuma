/**
 * Content comparison for catalogue sync.
 *
 * WaniKani bumps a subject's `data_updated_at` for edits to fields we never
 * extract — the interrupted 2026-08-30 sync fetched 4,000 rows and would have
 * rewritten 3,786 whose extracted content was byte-identical. Comparing the
 * fields we actually serve lets the sync skip those rows entirely.
 *
 * `rawData` and `dataUpdatedAt` are deliberately outside the comparison:
 * rawData is the very payload that churns, and the timestamp is what moved.
 * A skipped row keeps its old values of both — nothing in the app keys on
 * their freshness, and the sync cursor lives on the state row, not here.
 */

type JsonLike = unknown;

export type CatalogContentFields = {
  object: string;
  subjectType: string;
  level: number;
  slug: string | null;
  characters: string | null;
  documentUrl: string | null;
  hiddenAt: Date | null;
  meanings: JsonLike;
  readings: JsonLike;
  componentSubjectIds: number[];
  amalgamationSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
  meaningMnemonic: string | null;
  meaningHint: string | null;
  readingMnemonic: string | null;
  readingHint: string | null;
};

/** Field-order-independent structural equality over JSON-shaped values. */
export function jsonDeepEquals(left: JsonLike, right: JsonLike): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => jsonDeepEquals(value, right[index]));
  }

  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftEntries = Object.entries(left as Record<string, JsonLike>);
    const rightRecord = right as Record<string, JsonLike>;
    if (leftEntries.length !== Object.keys(rightRecord).length) {
      return false;
    }
    return leftEntries.every(
      ([key, value]) => key in rightRecord && jsonDeepEquals(value, rightRecord[key]),
    );
  }

  return false;
}

function datesEqual(left: Date | null, right: Date | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return left.getTime() === right.getTime();
}

function intArraysEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** True when every field the app serves is identical between the two rows. */
export function catalogContentEquals(
  existing: CatalogContentFields,
  next: CatalogContentFields,
): boolean {
  return (
    existing.object === next.object &&
    existing.subjectType === next.subjectType &&
    existing.level === next.level &&
    existing.slug === next.slug &&
    existing.characters === next.characters &&
    existing.documentUrl === next.documentUrl &&
    datesEqual(existing.hiddenAt, next.hiddenAt) &&
    existing.meaningMnemonic === next.meaningMnemonic &&
    existing.meaningHint === next.meaningHint &&
    existing.readingMnemonic === next.readingMnemonic &&
    existing.readingHint === next.readingHint &&
    intArraysEqual(existing.componentSubjectIds, next.componentSubjectIds) &&
    intArraysEqual(existing.amalgamationSubjectIds, next.amalgamationSubjectIds) &&
    intArraysEqual(existing.visuallySimilarSubjectIds, next.visuallySimilarSubjectIds) &&
    jsonDeepEquals(existing.meanings, next.meanings) &&
    jsonDeepEquals(existing.readings, next.readings)
  );
}

/** The select clause that loads exactly the compared fields plus the id and timestamp. */
export const CATALOG_CONTENT_SELECT = {
  wkSubjectId: true,
  dataUpdatedAt: true,
  object: true,
  subjectType: true,
  level: true,
  slug: true,
  characters: true,
  documentUrl: true,
  hiddenAt: true,
  meanings: true,
  readings: true,
  componentSubjectIds: true,
  amalgamationSubjectIds: true,
  visuallySimilarSubjectIds: true,
  meaningMnemonic: true,
  meaningHint: true,
  readingMnemonic: true,
  readingHint: true,
} as const;
