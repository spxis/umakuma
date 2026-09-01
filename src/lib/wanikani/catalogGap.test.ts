import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { subjectIdsInCache } from "./catalogGap";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const SCRIPT = "scripts/backfill-wk-catalog-missing.ts";

/**
 * Holes in `WkSubjectCatalog`.
 *
 * The catalogue is where subject content comes from, and anything absent from
 * it falls through to the WaniKani API on every request that wants it - the
 * exact cost the catalogue exists to avoid. Holes are not hypothetical: the
 * incremental sync can be interrupted, and a resumed run continues from its
 * cursor rather than going back for what it skipped. One was interrupted on
 * 2026-08-30 and left 98 subjects unreachable, almost all of them WaniKani's
 * kana-only vocabulary (これ, ホテル, おはよう).
 */

describe("reading subject ids out of an assignment cache", () => {
  /* The envelope shape, as a collection response stores it. */
  it("reads the wrapped shape", () => {
    expect(subjectIdsInCache([{ data: { subject_id: 440 } }])).toEqual([440]);
  });

  /* The flattened shape, as a sync writes it. */
  it("reads the flat shape", () => {
    expect(subjectIdsInCache([{ subject_id: 440 }])).toEqual([440]);
  });

  it("reads a cache holding both", () => {
    expect(subjectIdsInCache([{ data: { subject_id: 1 } }, { subject_id: 2 }])).toEqual([1, 2]);
  });

  /* A cache that is null, absent or some other shape is simply no ids. */
  it.each([null, undefined, {}, "", 0])("treats %p as empty", (value) => {
    expect(subjectIdsInCache(value)).toEqual([]);
  });

  /*
   * Anything that is not a positive whole number is not a subject id. A zero or
   * a negative would go into the fetch and come back unmatched, which reads as
   * "WaniKani did not serve it" rather than as bad input.
   */
  it.each([0, -1, 1.5, "440", null])("ignores %p as an id", (id) => {
    expect(subjectIdsInCache([{ subject_id: id }])).toEqual([]);
  });

  it("keeps duplicates for the caller to collapse", () => {
    expect(subjectIdsInCache([{ subject_id: 1 }, { subject_id: 1 }])).toEqual([1, 1]);
  });
});

/**
 * The backfill may add and may not change.
 *
 * It runs against a database in daily use. Every id it writes was established
 * as absent moments before, so an insert is safe in a way an update is not -
 * correcting stale content is the sync's job, and it has content comparison for
 * exactly that. A backfill that could overwrite is a backfill that could lose
 * something.
 */
describe("the backfill script", () => {
  const source = read(SCRIPT);

  it("inserts and skips duplicates rather than upserting", () => {
    expect(source).toContain("createMany");
    expect(source).toContain("skipDuplicates: true");
  });

  it("never updates or deletes", () => {
    for (const forbidden of ["upsert", "deleteMany", "updateMany", ".update(", ".delete("]) {
      expect(source, `a backfill must not ${forbidden}`).not.toContain(forbidden);
    }
  });

  /* Writing to production has to be asked for, not defaulted into. */
  it("is a dry run unless told otherwise", () => {
    expect(source).toContain('args.includes("--apply")');
    expect(source).toContain("Dry run. Re-run with --apply to insert these.");
  });

  /*
   * A subject WaniKani no longer serves, or one with no level, is a fact about
   * their data. The run should still place the others rather than throwing.
   */
  it("reports what it could not use instead of failing on it", () => {
    expect(source).toContain("notReturned");
    expect(source).toContain("unparsed");
  });

  /* It reuses the sync's mapping rather than growing a third copy of it. */
  it("maps rows the way the sync does", () => {
    expect(source).toContain("parseSubjectRow");
  });
});
