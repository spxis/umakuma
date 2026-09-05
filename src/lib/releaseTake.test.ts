import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { FEATURE_AREAS, FEATURE_STATUSES, type FeatureTimelineEntry } from "./featureTimeline";
import type { ReleaseCodename } from "./releaseCodenames";
import {
  codenameProblems,
  entryFromTicket,
  MAX_RELEASE_SUMMARY,
  releaseSummaryProblems,
  higherVersion,
  nextVersion,
  parseVersion,
  shipEntry,
  usedCodenameWords,
  editAppVersion,
  editAppendingCodename,
  editReplacingOnce,
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
  /* Everything before production is v0 and leads to 1.0.0; after it, a
     feature moves the minor and a tweak the patch. */
  it("leaves v0 for the first big release", () => {
    expect(nextVersion("0.381.0")).toBe("1.0.0");
  });

  it("moves the minor for a feature and the patch for a tweak", () => {
    expect(nextVersion("1.6.4")).toBe("1.7.0");
    expect(nextVersion("1.6.4", "tweak")).toBe("1.6.5");
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
  const stamp = { version: "0.296.0", releasedAt: "2026-09-02T16:00:00Z", date: "2026-09-02", release: 1 };

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

/*
 * A release that refuses has to leave the tree exactly as it found it.
 *
 * The script wrote its four files one after another with no rollback, so a
 * failure part way through left the timeline entry and the codename applied
 * and the two version files not: the tree looked like a release had been taken
 * when none had, and the re-run refused because the codename it had just
 * written was "already used by an earlier codename". It happened twice on
 * 2026-09-03, both times because another session shipped mid-flight.
 */
describe("working out the edits before writing any of them", () => {
  const CODENAMES_SOURCE = [
    "export const CODENAMES: ReleaseCodename[] = [",
    '  { romaji: "Aoi Ame", ja: "青い雨", reading: "あおいあめ", gloss: "blue rain" },',
    "];",
    "",
  ].join("\n");

  it("plans the codename onto the end of the list", () => {
    const edit = editAppendingCodename("codenames.ts", CODENAMES_SOURCE, {
      romaji: "Ii Hi",
      ja: "良い日",
      reading: "いいひ",
      gloss: "a good day",
    });
    expect(edit.file).toBe("codenames.ts");
    expect(edit.contents).toContain('romaji: "Ii Hi"');
    /* After the last one, not before it: the list is in release order. */
    expect(edit.contents.indexOf("Ii Hi")).toBeGreaterThan(edit.contents.indexOf("Aoi Ame"));
  });

  it("moves the version and the day it shipped together", () => {
    const text = [
      'export const APP_VERSION = "0.10.0";',
      'export const APP_VERSION_DATE = "2026-01-01";',
    ].join("\n");
    const edit = editAppVersion("appVersion.ts", text, "0.10.0", "0.11.0", "2026-09-03");
    expect(edit.contents).toContain('APP_VERSION = "0.11.0"');
    expect(edit.contents).toContain('APP_VERSION_DATE = "2026-09-03"');
  });

  /*
   * The failure that started this. Another session shipped, so the local file
   * no longer holds the version the edit expected - and the refusal has to
   * come before anything is written, which is what returning an edit rather
   * than performing one buys.
   */
  it("refuses when somebody else has shipped since you started", () => {
    const text = 'export const APP_VERSION = "0.12.0";';
    expect(() => editAppVersion("appVersion.ts", text, "0.10.0", "0.11.0", "2026-09-03")).toThrow(
      /does not hold 0\.10\.0/,
    );
  });

  it("says which file refused, and asks the question worth asking", () => {
    expect(() => editReplacingOnce("package.json", "{}", '"version": "0.10.0"', "x")).toThrow(
      /package\.json does not contain/,
    );
  });

  it("swaps exactly one occurrence", () => {
    const edit = editReplacingOnce("package.json", 'a "v": "1" b "v": "1"', '"v": "1"', '"v": "2"');
    expect(edit.contents).toBe('a "v": "2" b "v": "1"');
  });
});

describe("higherVersion", () => {
  it("takes main's number when nothing local is further along", () => {
    expect(higherVersion("0.429.0", "0.429.0")).toBe("0.429.0");
    expect(higherVersion("0.430.0", "0.429.0")).toBe("0.430.0");
  });

  it("takes the local number when features have been stamped but not pushed", () => {
    /* The batching case. Four features built and stamped before any is
       pushed: without this, every take reads main's 0.429.0 and hands back
       0.430.0 four times, and the collision is only found at the end, after
       four codenames have been chosen against the wrong kana. */
    expect(higherVersion("0.429.0", "0.432.0")).toBe("0.432.0");
  });

  it("falls back to main when there is no local version to read", () => {
    expect(higherVersion("0.429.0", null)).toBe("0.429.0");
    expect(higherVersion("0.429.0", undefined)).toBe("0.429.0");
  });
});

describe("what a release says on a public page", () => {
  const stamp = { version: "0.500.0", releasedAt: "2026-09-05T10:00:00Z", date: "2026-09-05", release: 1 };
  const ticket = { id: "a-thing", title: "A thing", area: "study", kind: "feature" };

  /* A release published "TOP PRIORITY: the header's right side carries the
     member, not the release" with WHAT GOES, CONSTRAINTS and src/ paths as its
     summary, because the ticket's detail was copied in verbatim. */
  it("takes the words the release was given, not the ticket's", () => {
    const entry = entryFromTicket(
      { ...ticket, detail: "TOP PRIORITY: do the thing.\nCONSTRAINTS: src/app/page.tsx" },
      stamp,
      { summary: "The header carries your XP now." },
    );
    expect(entry.summary).toBe("The header carries your XP now.");
  });

  it("refuses a summary that is a brief rather than a sentence", () => {
    for (const bad of [
      "TOP PRIORITY: ship the thing",
      "Fix it in src/lib/thing.ts",
      "Line one\nline two",
      "Something happened. Requested 2026-09-05 by John.",
      "",
      "x".repeat(MAX_RELEASE_SUMMARY + 1),
    ]) {
      expect(() => entryFromTicket(ticket, stamp, { summary: bad })).toThrow(/public page/);
    }
  });

  it("says what is wrong with it, so the second attempt is better", () => {
    expect(releaseSummaryProblems("See src/app/page.tsx")).toContain("names a source path");
    expect(releaseSummaryProblems("one\ntwo")).toContain("runs to more than one line");
    expect(releaseSummaryProblems("A good, plain summary of the change.")).toEqual([]);
  });

  /* A ticket title can be written as an instruction too - "Radical picker
     tiles should be blue, not white" is a request, not a release. */
  it("lets the release rename itself where the ticket's title is an instruction", () => {
    const entry = entryFromTicket(ticket, stamp, {
      summary: "Radicals are blue everywhere they are offered.",
      name: "Every radical is blue",
    });
    expect(entry.name).toBe("Every radical is blue");
  });

  it("keeps the ticket's title when the release does not override it", () => {
    expect(entryFromTicket(ticket, stamp, { summary: "A plain summary." }).name).toBe("A thing");
  });

  it("trims what it is given, so a stray newline is not stored", () => {
    const entry = entryFromTicket(ticket, stamp, { summary: "  A plain summary.  " });
    expect(entry.summary).toBe("A plain summary.");
  });

  it("is required by the script, not merely available to it", () => {
    const script = readFileSync("scripts/release-take.ts", "utf8");
    expect(script).toContain("--summary is required with --ticket");
  });
});
