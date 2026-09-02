import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  addEntry,
  claimEntry,
  formatBoard,
  nextFreeRelease,
  openWork,
  releaseEntry,
  stringifyTimeline,
} from "./backlogBoard";
import { FEATURE_KINDS, FEATURE_STATUSES, type FeatureTimelineEntry } from "./featureTimeline";

/**
 * The board several agents work from.
 *
 * Each rule below is a thing that went wrong by hand in one afternoon: two
 * planned entries on the same number, a request that lived only in a chat, a
 * file rewritten end to end by a save that changed one line. The maths is
 * tested on rows so the CLI can be a thin wrapper that only reads and writes.
 */

function entry(overrides: Partial<FeatureTimelineEntry> & { id: string }): FeatureTimelineEntry {
  return {
    name: overrides.id,
    area: "platform",
    status: FEATURE_STATUSES.planned,
    date: "2026-09-01",
    dateIsEstimate: true,
    summary: "Something to do.",
    release: 1,
    ...overrides,
  };
}

const QUEUE = [
  entry({ id: "first", release: 3 }),
  entry({ id: "second", release: 7 }),
  entry({ id: "done", status: FEATURE_STATUSES.shipped, release: undefined, version: "0.1.0" }),
];

describe("adding a request", () => {
  it("takes the next number after the queue, never one in use", () => {
    expect(nextFreeRelease(QUEUE)).toBe(8);
    expect(nextFreeRelease([])).toBe(1);
  });

  it("records it as planned, dated today as an estimate", () => {
    const [added] = addEntry(QUEUE, { id: "new", name: "New", area: "study", summary: "Do it." }, "2026-09-02").slice(-1);
    expect(added).toMatchObject({
      id: "new",
      status: FEATURE_STATUSES.planned,
      kind: FEATURE_KINDS.feature,
      date: "2026-09-02",
      dateIsEstimate: true,
      release: 8,
    });
  });

  it("keeps a bug a bug", () => {
    const [added] = addEntry(QUEUE, { id: "b", name: "B", area: "study", summary: "Broken.", kind: FEATURE_KINDS.bug }, "2026-09-02").slice(-1);
    expect(added!.kind).toBe(FEATURE_KINDS.bug);
  });

  it("refuses an id already in the file", () => {
    expect(() => addEntry(QUEUE, { id: "first", name: "x", area: "study", summary: "x" }, "2026-09-02")).toThrow(/already exists/);
  });
});

describe("picking work up", () => {
  it("marks who has it and since when", () => {
    const [claimed] = claimEntry(QUEUE, "first", "fable/subject-pages", "2026-09-02T03:00:00Z");
    expect(claimed).toMatchObject({ owner: "fable/subject-pages", claimedAt: "2026-09-02T03:00:00Z" });
  });

  /* A claim that can be taken over silently is no claim at all. */
  it("refuses to take work another agent holds", () => {
    const held = claimEntry(QUEUE, "first", "opus/search", "2026-09-02T03:00:00Z");
    expect(() => claimEntry(held, "first", "fable/subject-pages", "2026-09-02T04:00:00Z")).toThrow(/already claimed by opus\/search/);
  });

  it("lets the same agent re-claim its own work", () => {
    const held = claimEntry(QUEUE, "first", "opus/search", "2026-09-02T03:00:00Z");
    expect(() => claimEntry(held, "first", "opus/search", "2026-09-02T04:00:00Z")).not.toThrow();
  });

  it("only claims planned work", () => {
    expect(() => claimEntry(QUEUE, "done", "anyone", "2026-09-02T03:00:00Z")).toThrow(/shipped/);
    expect(() => claimEntry(QUEUE, "missing", "anyone", "2026-09-02T03:00:00Z")).toThrow(/No entry/);
  });

  it("can be put down again, leaving no trace of the claim", () => {
    const held = claimEntry(QUEUE, "first", "opus/search", "2026-09-02T03:00:00Z");
    const [freed] = releaseEntry(held, "first");
    expect(freed).not.toHaveProperty("owner");
    expect(freed).not.toHaveProperty("claimedAt");
  });
});

describe("reading the board", () => {
  it("puts what is in progress first, then the queue in order", () => {
    const held = claimEntry(QUEUE, "second", "opus/search", "2026-09-02T03:00:00Z");
    expect(openWork(held).map((item) => item.id)).toEqual(["second", "first"]);
  });

  it("leaves shipped work off it", () => {
    expect(openWork(QUEUE).map((item) => item.id)).toEqual(["first", "second"]);
  });

  it("says how much is open, how much is claimed, and how many are bugs", () => {
    const board = formatBoard([
      ...claimEntry(QUEUE, "first", "opus/search", "2026-09-02T03:00:00Z"),
      entry({ id: "bug", release: 9, kind: FEATURE_KINDS.bug }),
    ]);
    expect(board).toContain("3 open · 1 in progress · 1 bugs");
    expect(board).toContain("IN PROGRESS · opus/search");
    expect(board).toContain("BUG ");
  });
});

/*
 * The file stores every non-ASCII character escaped. A save that wrote them
 * raw would turn a one-line change into a rewrite of every Japanese title.
 */
describe("saving the file", () => {
  it("escapes what the file escapes, so a diff is only what changed", () => {
    const text = stringifyTimeline([entry({ id: "jp", name: "水" })]);
    expect(text).toContain('"name": "\\u6c34"');
    expect(text).not.toContain("水");
    expect(text.endsWith("\n")).toBe(true);
  });

  /*
   * And the shipped file itself, which is the half that was going wrong.
   *
   * Several sessions write this board at once. A session that wrote it with a
   * plain JSON writer stored 186 Japanese characters raw, and the next
   * legitimate `pnpm backlog` run re-escaped all of them - so a two-field
   * claim came out as a forty-line diff scattered through the file, two
   * sessions doing it overlapped everywhere instead of in one place, and an
   * entry was lost in a merge that never reported a conflict. The helper was
   * always right; nothing checked that the file had gone through it.
   */
  it("keeps the committed board escaped, whoever wrote it last", () => {
    const raw = readFileSync(join(process.cwd(), "src", "data", "featureTimeline.json"), "utf8");
    const offenders = [...new Set([...raw].filter((character) => character.charCodeAt(0) > 127))];
    expect(
      offenders,
      "featureTimeline.json holds raw non-ASCII: write it with stringifyTimeline (pnpm backlog), never a plain JSON writer",
    ).toEqual([]);
  });
});
