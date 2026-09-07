import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAP_SUBJECT_ID_BASE } from "@/lib/japanPrefectures";

import { LADDER_SOURCES, LADDER_SOURCE_VALUES } from "./ladderCrosswalk";
import { buildLadderSeedPlan, diffLadderSeed, UK_SUBJECT_KINDS, type LadderSeedInput } from "./ladderSeedPlan";
import { isUkGameSubjectId, toUkGameSubjectId, UK_SUBJECT_ID_BASE, ukSubjectIdFrom } from "./ukSubjectIds";

const input: LadderSeedInput = {
  kanji: {
    日: { level: 1, waniKaniLevel: 2, nLevel: 5 },
    苺: { level: 14, waniKaniLevel: null, nLevel: null },
  },
  radicals: { 口: 1, ノ: 1 },
  vocabulary: { "2467": 3 },
  /* The same subjects on the school-year ladder. 日 is grade 1 there and
     early; 苺 is not a school kanji and lands late. */
  grade: {
    kanji: { 日: 2, 苺: 60 },
    radicals: { 口: 1, ノ: 2 },
    vocabulary: { "2467": 9 },
  },
  dictionary: new Map([
    ["日", { meanings: ["day", "sun"], onReadings: ["ニチ"], kunReadings: ["ひ"], grade: 1 }],
    ["苺", { meanings: ["strawberry"], onReadings: ["バイ"], kunReadings: ["いちご"], grade: null }],
    ["口", { meanings: ["mouth"], onReadings: ["コウ"], kunReadings: ["くち"], grade: 1 }],
  ]),
  kanjiSubjectIds: new Map([["日", 476]]),
  vocabularyCharacters: new Map([[2467, "一"]]),
};

describe("the rows the curriculum should hold", () => {
  const rows = buildLadderSeedPlan(input);
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));

  it("keys every item uniquely across the three kinds", () => {
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
    expect(Object.keys(byKey).sort()).toEqual(["kanji:日", "kanji:苺", "radical:ノ", "radical:口", "wk:2467"]);
  });

  /*
   * Content travels only for what WaniKani does not teach. Copying their
   * meanings here would be a second answer going stale beside a catalogue that
   * syncs on its own, and their mnemonics are not ours to store at all.
   */
  it("carries content only for items WaniKani does not teach", () => {
    expect(byKey["kanji:日"]).toMatchObject({ source: LADDER_SOURCES.wanikani, meanings: [], readings: [] });
    expect(byKey["kanji:苺"]).toMatchObject({ source: LADDER_SOURCES.kanjidic, meanings: ["strawberry"] });
    expect(byKey["kanji:苺"].readings).toEqual(["バイ", "いちご"]);
    /* Radicals are RADKFILE's, which WaniKani does not use, so all of them carry theirs. */
    expect(byKey["radical:口"]).toMatchObject({ source: LADDER_SOURCES.radkfile, meanings: ["mouth"] });
  });

  it("links to the WaniKani subject where there is one", () => {
    expect(byKey["kanji:日"].wkSubjectId).toBe(476);
    expect(byKey["kanji:苺"].wkSubjectId).toBeNull();
    expect(byKey["wk:2467"].wkSubjectId).toBe(2467);
  });

  it("orders a level the way it is met: radicals, kanji, then words", () => {
    expect(rows.map((row) => row.kind)).toEqual([
      UK_SUBJECT_KINDS.radical,
      UK_SUBJECT_KINDS.radical,
      UK_SUBJECT_KINDS.kanji,
      UK_SUBJECT_KINDS.vocabulary,
      UK_SUBJECT_KINDS.kanji,
    ]);
  });
});

describe("what a seed run would change", () => {
  const rows = buildLadderSeedPlan(input);
  const stored = (over: Partial<Record<string, unknown>> = {}) => ({
    key: "kanji:日", kind: "kanji", characters: "日", level: 1, ugLevel: 2, wkSubjectId: 476,
    source: "wanikani", nLevel: 5, schoolGrade: 1, meanings: [], readings: [],
    removedAt: null, ...over,
  });

  it("creates what is missing and leaves what agrees alone", () => {
    const diff = diffLadderSeed(rows, [stored()]);
    expect(diff.unchanged).toBe(1);
    expect(diff.update).toHaveLength(0);
    expect(diff.create.map((row) => row.key).sort()).toEqual(["kanji:苺", "radical:ノ", "radical:口", "wk:2467"]);
  });

  /* The bug this comparison was missing: six radicals shipped with no meaning,
     the plan was corrected to name them, and a re-seed counted every one of
     them unchanged. A row that gains a name is a row that changed. */
  it("updates a row whose name has changed", () => {
    const named = diffLadderSeed(
      buildLadderSeedPlan({ ...input, radicals: { 口: 1 } }),
      [{ ...stored(), key: "radical:口", kind: "radical", characters: "口", source: "radkfile", wkSubjectId: null, nLevel: null, schoolGrade: null, meanings: [] }],
    );
    expect(named.update.map((row) => row.key)).toContain("radical:口");
  });

  it("leaves a row alone when the name it holds is the one planned", () => {
    const same = diffLadderSeed(
      buildLadderSeedPlan({ ...input, radicals: { 口: 1 } }),
      [{ ...stored(), key: "radical:口", kind: "radical", characters: "口", ugLevel: 1, source: "radkfile", wkSubjectId: null, nLevel: null, schoolGrade: null, meanings: ["mouth"] }],
    );
    expect(same.update).toHaveLength(0);
  });

  it("updates a row whose level has moved", () => {
    const diff = diffLadderSeed(rows, [stored({ level: 9 })]);
    expect(diff.update.map((row) => row.key)).toEqual(["kanji:日"]);
  });

  /* A restored item comes back rather than staying hidden. */
  it("revives a row that had been marked removed", () => {
    const diff = diffLadderSeed(rows, [stored({ removedAt: new Date() })]);
    expect(diff.update.map((row) => row.key)).toEqual(["kanji:日"]);
  });

  it("marks what the ladder no longer places, and never twice", () => {
    const gone = { ...stored(), key: "kanji:朕" };
    expect(diffLadderSeed(rows, [gone]).remove).toEqual(["kanji:朕"]);
    expect(diffLadderSeed(rows, [{ ...gone, removedAt: new Date() }]).remove).toEqual([]);
  });

  it("has nothing to do the second time", () => {
    const asStored = rows.map((row) => ({ ...row, removedAt: null }));
    const diff = diffLadderSeed(rows, asStored);
    expect([diff.create.length, diff.update.length, diff.remove.length]).toEqual([0, 0, 0]);
    expect(diff.unchanged).toBe(rows.length);
  });
});

/*
 * Three id spaces share `subjectId` columns with no column saying which is
 * which. They must not touch: tagging a curriculum item would otherwise tag a
 * WaniKani subject, which is a bug nothing would report.
 */
describe("curriculum ids stay clear of everybody else's", () => {
  it("sits above WaniKani and below the maps", () => {
    /* WaniKani's catalogue tops out in the low ten-thousands. */
    expect(UK_SUBJECT_ID_BASE).toBeGreaterThan(100_000);
    expect(UK_SUBJECT_ID_BASE).toBeLessThan(MAP_SUBJECT_ID_BASE);
    expect(UK_SUBJECT_ID_BASE + 1_000_000).toBeLessThanOrEqual(MAP_SUBJECT_ID_BASE);
  });

  it("round-trips a row id and refuses everybody else's", () => {
    expect(ukSubjectIdFrom(toUkGameSubjectId(42))).toBe(42);
    expect(isUkGameSubjectId(476)).toBe(false);
    expect(isUkGameSubjectId(MAP_SUBJECT_ID_BASE + 13)).toBe(false);
    expect(ukSubjectIdFrom(476)).toBeNull();
  });
});

/*
 * The schema and the code each name the same two sets of domain values. AGENTS
 * is explicit that a second list drifts from the first and that a unit test
 * over either one will not notice — so this is the test over both. It reads the
 * schema as text rather than importing the generated client, because the client
 * is regenerated from the schema and would agree with itself either way.
 */
describe("the schema and the code name the same domain values", () => {
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

  const membersOf = (name: string) => {
    const block = new RegExp(`enum ${name} \\{([^}]*)\\}`).exec(schema);
    expect(block, `enum ${name} is missing from the schema`).toBeTruthy();
    return (block?.[1] ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("///"))
      .sort();
  };

  it("agrees on where an item's facts come from", () => {
    expect(membersOf("UkSubjectSource")).toEqual([...LADDER_SOURCE_VALUES].sort());
  });

  it("agrees on the three kinds of item", () => {
    expect(membersOf("UkSubjectKind")).toEqual(Object.values(UK_SUBJECT_KINDS).sort());
  });
});

describe("radicals linked to WaniKani's own", () => {
  const input = {
    kanji: { 七: { level: 3, waniKaniLevel: 2, nLevel: 5 } },
    radicals: { 七: 2, 丿: 1 },
    vocabulary: {},
    grade: { kanji: { 七: 3 }, radicals: { 七: 2, 丿: 1 }, vocabulary: {} },
    dictionary: new Map([["七", { meanings: ["seven"], onReadings: ["シチ"], kunReadings: ["なな"], grade: 1 }]]),
    kanjiSubjectIds: new Map([["七", 500]]),
    vocabularyCharacters: new Map(),
    radicalSubjectIds: new Map([["七", 12]]),
  };

  it("pairs a radical with WaniKani's radical, never with their kanji", () => {
    /* WaniKani teaches 七 twice under different ids. Linking our radical to
       their kanji id would credit somebody who learned the shape with knowing
       the character, which is not the same thing. */
    const rows = buildLadderSeedPlan(input);
    const radical = rows.find((row) => row.key === "radical:七");
    const kanji = rows.find((row) => row.key === "kanji:七");
    expect(radical?.wkSubjectId).toBe(12);
    expect(kanji?.wkSubjectId).toBe(500);
  });

  it("leaves a radical WaniKani does not teach unlinked", () => {
    expect(buildLadderSeedPlan(input).find((row) => row.key === "radical:丿")?.wkSubjectId).toBeNull();
  });

  it("keeps the source as radkfile even when WaniKani teaches it too", () => {
    /* Where an item came from and who else teaches it are different
       questions. The list is still RADKFILE's. */
    expect(buildLadderSeedPlan(input).find((row) => row.key === "radical:七")?.source).toBe("radkfile");
  });

  it("links without the map at all, so the seed still runs", () => {
    const { radicalSubjectIds: _omitted, ...without } = input;
    expect(buildLadderSeedPlan(without).find((row) => row.key === "radical:七")?.wkSubjectId).toBeNull();
  });
});

describe("a word's written form", () => {
  it("is carried on the row, from the catalogue, so nothing downstream draws a blank", () => {
    /* The first seed left all 6,795 words with characters "" - "a level and
       a pointer" - and every game, placement probe and lesson card that read
       the row drew nothing. */
    const word = buildLadderSeedPlan(input).find((row) => row.key === "wk:2467");
    expect(word?.characters).toBe("一");
  });
});

/**
 * Every subject carries both levels, and a move on either ladder is a change.
 *
 * `UkSubject.level` was the UN level and there was nothing for UG: its
 * placement lived only in gradeLadder.json, resolved per request, so nothing
 * could walk it - `Account.ugLevel` was a column nothing wrote, and every UG
 * member was taught in UN order. Both ladders are built in one pass so they
 * cannot drift; the seed used to copy half of that into the database.
 */
describe("the seed carries the UG level beside the UN one", () => {
  const rows = buildLadderSeedPlan(input);
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));

  it("places every kind on the UG ladder", () => {
    expect(byKey["kanji:日"]).toMatchObject({ level: 1, ugLevel: 2 });
    expect(byKey["kanji:苺"]).toMatchObject({ level: 14, ugLevel: 60 });
    expect(byKey["radical:ノ"]).toMatchObject({ level: 1, ugLevel: 2 });
    expect(byKey["wk:2467"]).toMatchObject({ level: 3, ugLevel: 9 });
  });

  it("gives every row a UG level, never a default", () => {
    for (const row of rows) expect(Number.isInteger(row.ugLevel) && row.ugLevel >= 1, row.key).toBe(true);
  });

  /*
   * A gap between the ladders is a build bug, not a row to default. Writing a
   * 1 would put the subject on UG level 1 for every member, silently.
   */
  it("refuses a subject the UN ladder places and UG does not", () => {
    const broken: LadderSeedInput = { ...input, grade: { ...input.grade, kanji: { 日: 2 } } };
    expect(() => buildLadderSeedPlan(broken)).toThrow(/does not place kanji 苺/);
  });

  /* A kanji that moves on UG alone must reach the database, or a UG
     rebalance would seed as "nothing to do". */
  it("counts a UG-only move as a change", () => {
    const stored = rows.map((row) => ({ ...row, removedAt: null }));
    const moved: LadderSeedInput = { ...input, grade: { ...input.grade, kanji: { 日: 3, 苺: 60 } } };
    const diff = diffLadderSeed(buildLadderSeedPlan(moved), stored);
    expect(diff.update.map((row) => row.key)).toEqual(["kanji:日"]);
    expect(diff.create).toEqual([]);
  });
});
