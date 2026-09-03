import { describe, expect, it } from "vitest";

import { FEATURE_AREAS, FEATURE_STATUSES, type FeatureTimelineEntry } from "./featureTimeline";
import type { ReleaseCodename } from "./releaseCodenames";
import {
  codenameProblems,
  minorOf,
  nextVersion,
  parseVersion,
  shipEntry,
  usedCodenameWords,
} from "./releaseTake";

const entry = (over: Partial<FeatureTimelineEntry> = {}): FeatureTimelineEntry => ({
  id: "thing",
  name: "A thing",
  area: FEATURE_AREAS.study,
  status: FEATURE_STATUSES.planned,
  date: "2026-09-02",
  summary: "Something that was asked for.",
  ...over,
});

const codename = (romaji: string, reading: string): ReleaseCodename => ({
  romaji,
  ja: romaji,
  reading,
  gloss: "a thing",
});

describe("the next number", () => {
  it("moves the minor, which is the only thing a release moves", () => {
    expect(nextVersion("0.294.0")).toBe("0.295.0");
    expect(minorOf("0.295.0")).toBe(295);
  });

  it("refuses anything that is not a version this repository uses", () => {
    expect(parseVersion("0.295")).toBeNull();
    expect(() => nextVersion("v1")).toThrow();
  });
});

describe("what a codename may be", () => {
  const existing = [codename("Nushi ga Kimeru", "ぬしがきめる"), codename("Hoshii Meibo", "ほしいめいぼ")];

  /* 0.296.0 lands on み. This is the one that catches a renumber. */
  it("refuses a reading that does not start on the release's kana", () => {
    const problems = codenameProblems(codename("Mayowanai Michinori", "まよわないみちのり"), 296, existing);
    expect(problems.map((problem) => problem.field)).toContain("kana");
  });

  it("accepts the same name one release later, when the kana has moved to it", () => {
    expect(codenameProblems(codename("Mitorizu no Machikado", "みとりずのまちかど"), 296, existing)).toEqual([]);
  });

  /*
   * `ga` is not a particle the rule exempts, only `na` and `no` are - which is
   * exactly the collision that cost two attempts on one afternoon.
   */
  it("refuses a word an earlier name already used, particles aside", () => {
    const problems = codenameProblems(codename("Michinori ga Mieru", "みちのりがみえる"), 296, existing);
    expect(problems.map((problem) => problem.message)).toContain('"ga" is already used by an earlier codename.');
  });

  it("lets na and no recur, because they are grammar", () => {
    expect(usedCodenameWords([codename("Kogane no Koi", "こがねのこい")])).toEqual(new Set(["kogane", "koi"]));
  });

  it("wants a gloss somebody could read", () => {
    const bare = { ...codename("Mitorizu no Machikado", "みとりずのまちかど"), gloss: "x" };
    expect(codenameProblems(bare, 296, existing).map((problem) => problem.field)).toContain("gloss");
  });
});

describe("shipping the entry", () => {
  const stamp = { version: "0.296.0", releasedAt: "2026-09-02T16:00:00Z", date: "2026-09-02" };

  it("stamps it and drops what only a plan carries", () => {
    const [shipped] = shipEntry(
      [entry({ dateIsEstimate: true, release: 60, owner: "Claude", claimedAt: "2026-09-02T15:00:00Z" })],
      "thing",
      stamp,
    );
    expect(shipped).toEqual({
      id: "thing",
      name: "A thing",
      area: FEATURE_AREAS.study,
      status: FEATURE_STATUSES.shipped,
      date: "2026-09-02",
      summary: "Something that was asked for.",
      version: "0.296.0",
      releasedAt: "2026-09-02T16:00:00Z",
    });
  });

  it("leaves every other entry exactly as it was", () => {
    const board = [entry(), entry({ id: "other", release: 61 })];
    expect(shipEntry(board, "thing", stamp)[1]).toEqual(board[1]);
  });

  /* The race this exists to lose safely: somebody took the number first. */
  it("refuses a version another entry already holds", () => {
    const board = [entry(), entry({ id: "taken", status: FEATURE_STATUSES.shipped, version: "0.296.0" })];
    expect(() => shipEntry(board, "thing", stamp)).toThrow(/already taken/);
  });

  it("refuses to ship what has already shipped, or what is not there", () => {
    expect(() =>
      shipEntry([entry({ status: FEATURE_STATUSES.shipped, version: "0.200.0" })], "thing", stamp),
    ).toThrow(/already shipped/);
    expect(() => shipEntry([entry()], "missing", stamp)).toThrow(/No entry/);
  });
});
