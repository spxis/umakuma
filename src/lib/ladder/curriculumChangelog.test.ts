import { describe, expect, it } from "vitest";

import kanjiLadder from "@/data/kanjiLadder.json";

import { LADDER_STREAMS } from "./ladderStreams";
import { curriculumChangelogFor, hasCurriculumChanges } from "./curriculumChangelog";

/*
 * The stamp on every chart says which curriculum it was drawn from, and until
 * this existed that was the end of the trail: a member whose level moved under
 * them could read `UN 2.0.0` and had no way to find out what 2.0.0 did.
 *
 * These read the shipped ladders rather than a fixture, on purpose. The shape
 * is the build's, not this module's, and a rebuild that changed it would pass
 * a fixture and break the page.
 */
describe("what a rebuild moved, per ladder", () => {
  it("reads a changelog for each stream, newest first", () => {
    for (const stream of [LADDER_STREAMS.un, LADDER_STREAMS.ug]) {
      const entries = curriculumChangelogFor(stream);

      expect(entries.length, `${stream} has a changelog`).toBeGreaterThan(0);
      expect(hasCurriculumChanges(stream)).toBe(true);
      for (const entry of entries) {
        expect(entry.version, `${stream} entry is versioned`).toMatch(/^\d+\.\d+\.\d+$/);
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.summary.length).toBeGreaterThan(0);
      }
    }
  });

  /*
   * The asymmetry the build actually recorded, pinned because the page draws
   * two different things from it: characters for kanji, a tally for the rest.
   * 1,537 words moved in one rebuild and nobody is going to read that list.
   */
  it("gives kanji as moves and the rest as counts", () => {
    const [entry] = curriculumChangelogFor(LADDER_STREAMS.un);

    expect(Array.isArray(entry!.kanji.moved)).toBe(true);
    expect(typeof entry!.radicals.moved).toBe("number");
    expect(typeof entry!.vocabulary.moved).toBe("number");
  });

  /*
   * Every move carries where it came from and where it went.
   *
   * The panel could only say *which* characters moved, and said so in its own
   * footer, because the build kept the verdict and dropped the pair. John:
   * "show the change +3 or -5 etc for the kanji, which shows how they moved."
   */
  it("says how far every kanji moved, not only that it moved", () => {
    for (const stream of [LADDER_STREAMS.un, LADDER_STREAMS.ug]) {
      const [entry] = curriculumChangelogFor(stream);
      expect(entry!.kanji.moved.length).toBeGreaterThan(0);
      for (const move of entry!.kanji.moved) {
        expect(typeof move.key).toBe("string");
        expect(Number.isInteger(move.from)).toBe(true);
        expect(Number.isInteger(move.to)).toBe(true);
        /* A move that went nowhere is not a move, and would draw a "+0" tag. */
        expect(move.from).not.toBe(move.to);
      }
    }
  });

  /*
   * The recovered numbers, pinned against the ladder they describe.
   *
   * These were reconstructed from the 1.0.0 ladders in git rather than
   * recorded at the time, so the thing worth failing on is the pair still
   * agreeing with the shipped ladder: a moved kanji's `to` is the level it
   * actually sits on today.
   */
  it("lands every move on the level the ladder now teaches", () => {
    const [entry] = curriculumChangelogFor(LADDER_STREAMS.un);
    const levels = kanjiLadder.kanjiLevel as Record<string, { level: number }>;
    const wrong = entry!.kanji.moved.filter((move) => levels[move.key]?.level !== move.to);
    expect(wrong).toEqual([]);
  });

  /* The two ladders move independently, which is the whole reason the surface
     is per stream: the rebuild that moved 95 kanji on UN moved 12 on UG. */
  it("keeps the streams apart", () => {
    const un = curriculumChangelogFor(LADDER_STREAMS.un)[0]!;
    const ug = curriculumChangelogFor(LADDER_STREAMS.ug)[0]!;

    expect(un.kanji.moved.length).not.toBe(ug.kanji.moved.length);
  });

  /* The summary is the build's own sentence and the page prints it verbatim,
     so it must agree with the numbers beside it. */
  it("summarises the same numbers the page prints", () => {
    for (const stream of [LADDER_STREAMS.un, LADDER_STREAMS.ug]) {
      const entry = curriculumChangelogFor(stream)[0]!;

      expect(entry.summary).toContain(String(entry.kanji.moved.length));
      expect(entry.summary).toContain(String(entry.vocabulary.moved));
    }
  });
});
