import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const SOURCE = "src/lib/wanikani/kanjiIndex.ts";

/**
 * Where the member's kanji come from.
 *
 * Subject content is static and already synced into `WkSubjectCatalog`, so it
 * is read from there; only the ids the catalogue has never seen fall through
 * to the API. Reading them all from WaniKani in 200-id chunks is what made
 * this 11-14 seconds, and it came down to 6-8 by asking the database first.
 *
 * Nothing about the *behaviour* changes if that order is reversed - the same
 * kanji come back, slowly - so a behavioural test cannot catch it and these
 * read the source instead. The same two assertions guard the JLPT counts in
 * leaderboardJlpt.ts, which had the same bug.
 *
 * Assignments are deliberately not covered: they are the member's own SRS
 * state, they are supposed to be live, and they must keep coming from the API.
 */
describe("the kanji index", () => {
  it("reads the catalogue before it reaches for WaniKani", () => {
    const source = read(SOURCE);
    const catalogAt = source.indexOf("getCatalogSubjectDetails(");
    const subjectsAt = source.indexOf("fetchAllCollectionPages(`/subjects?ids=");
    expect(catalogAt, "the catalogue read should be there").toBeGreaterThan(-1);
    expect(subjectsAt, "the API fallback should still be there").toBeGreaterThan(-1);
    expect(catalogAt).toBeLessThan(subjectsAt);
  });

  it("asks the API only for the ids the catalogue missed", () => {
    expect(read(SOURCE)).toContain("missing.slice(i, i + chunkSize)");
  });

  it("still asks WaniKani for the assignments, which are the member's own", () => {
    expect(read(SOURCE)).toContain("/assignments?subject_types=");
  });
});
