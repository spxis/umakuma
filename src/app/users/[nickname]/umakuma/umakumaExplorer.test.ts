import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { ladderLevelPage, ladderLevelSections, ladderRowAsSubject } from "@/lib/ladder/ladderLevelPage";
import type { LadderRow } from "@/lib/ladder/ladderCrosswalk";
import { CURRICULUM_PAPERS_URL } from "@/lib/ladder/curriculumPapers";

import { clampLadderLevel, parseLadderLevel, umakumaLevelHref, UK_EXPLORER_PAGE } from "./umakumaAddress";

const DIR = "src/app/users/[nickname]/umakuma";

const row = (over: Partial<LadderRow> = {}): LadderRow =>
  ({
    key: "kanji:日",
    kind: "kanji",
    characters: "日",
    unLevel: 3,
    wkLevel: 2,
    wkSubjectId: 476,
    nLevel: 5,
    schoolGrade: 1,
    band: null,
    frequencyRank: 1,
    primaryMeaning: "sun",
    source: "wanikani",
    ...over,
  }) as LadderRow;

describe("a level has an address", () => {
  /* John: "the URL should be RESTful like the other pages like Grades." The
     explorer paged ten levels behind one URL, so there was no way to link to
     a level, come back to one, or say which one you were looking at. */
  it("names the level in the path", () => {
    expect(umakumaLevelHref("testkuma", 23)).toBe("/users/testkuma/umakuma/23");
    expect(UK_EXPLORER_PAGE.path).toBe("umakuma");
  });

  it("escapes a nickname that needs it", () => {
    expect(umakumaLevelHref("a b", 1)).toBe("/users/a%20b/umakuma/1");
  });

  it("reads a level back, and refuses one the ladder has not got", () => {
    expect(parseLadderLevel("23")).toBe(23);
    expect(parseLadderLevel(String(KANJI_LADDER_LEVELS))).toBe(KANJI_LADDER_LEVELS);
    for (const bad of ["0", "-1", "1.5", "abc", String(KANJI_LADDER_LEVELS + 1), undefined]) {
      expect(parseLadderLevel(bad), String(bad)).toBeNull();
    }
  });

  it("clamps to a level that exists", () => {
    expect(clampLadderLevel(0)).toBe(1);
    expect(clampLadderLevel(9_999)).toBe(KANJI_LADDER_LEVELS);
    expect(clampLadderLevel(23)).toBe(23);
  });
});

describe("one level, not ten", () => {
  const rows = [
    row({ key: "radical:口", kind: "radical", characters: "口", unLevel: 1, primaryMeaning: "mouth" }),
    row({ key: "kanji:日", unLevel: 1 }),
    row({ key: "kanji:月", characters: "月", unLevel: 2, primaryMeaning: "moon" }),
  ];

  it("draws the level asked for and nothing else", () => {
    const page = ladderLevelPage(rows, KANJI_LADDER_LEVELS, 1);
    expect(page.group.level).toBe(1);
    expect(page.group.kanji.map((entry) => entry.characters)).toEqual(["日"]);
    expect(page.group.radicals.map((entry) => entry.characters)).toEqual(["口"]);
  });

  it("still counts the whole ladder up to it, not just the level", () => {
    expect(ladderLevelPage(rows, KANJI_LADDER_LEVELS, 2).group.kanjiThrough).toBe(2);
  });

  it("hands the picker every level, so a hundred chips can be drawn", () => {
    expect(ladderLevelPage(rows, KANJI_LADDER_LEVELS, 1).levels).toHaveLength(KANJI_LADDER_LEVELS);
  });

  it("draws an empty level rather than nothing at all", () => {
    const page = ladderLevelPage(rows, KANJI_LADDER_LEVELS, 90);
    expect(page.group.level).toBe(90);
    expect(page.group.kanji).toEqual([]);
  });

  it("meets a level in the order it is taught", () => {
    const page = ladderLevelPage(rows, KANJI_LADDER_LEVELS, 1);
    expect(ladderLevelSections(page.group).map((section) => section.type)).toEqual([
      "radical",
      "kanji",
      "vocabulary",
    ]);
  });
});

describe("a kanji here looks like a kanji everywhere else", () => {
  /* John: "the UK explorer really should look like the others... meaning the
     big blocks", and it should have grid and list view like the others. It
     drew its own tiles, which is what made it the odd one out. */
  it("hands the level to the shared subject list", () => {
    const board = readFileSync(`${DIR}/UmakumaLevelBoard.tsx`, "utf8");
    expect(board).toContain('from "@/app/shared/SubjectCards"');
    expect(board).toContain('from "@/app/shared/SubjectRows"');
    expect(board).toContain("SubjectViewModeToggle");
  });

  it("shapes a ladder row the way that list takes one", () => {
    const subject = ladderRowAsSubject(row());
    expect(subject).toMatchObject({ glyph: "日", meaning: "sun", subjectType: "kanji", wkLevel: 2 });
    /* This is the curriculum, not the member's progress through it: colouring
       a browse page by SRS state would make two questions look like one. */
    expect(subject.srsStage).toBeNull();
  });

  it("keeps the live search and the type filter, which it was already better at", () => {
    const board = readFileSync(`${DIR}/UmakumaLevelBoard.tsx`, "utf8");
    expect(board).toContain("UmakumaLadderSearch");
    expect(board).toContain("setKind");
    expect(readFileSync(`${DIR}/UmakumaLadderSearch.tsx`, "utf8")).toContain("/api/uk-ladder?");
  });

  /* John: "I don't like redirects if it's fake for the site. Need to be real
     rest site." So the collection is a page, not a bounce to a member of it.
     What it serves changed - see below - but never by bouncing. */
  it("serves a page at the collection address rather than a redirect", () => {
    const page = readFileSync(`${DIR}/page.tsx`, "utf8");
    expect(page).toContain("UmakumaLevelBoard");
    expect(page).not.toContain("redirect(");
  });

  /*
   * John, on the card grid headed "All 100 levels": "The original page we see
   * with the All 100 Levels is NOT needed. It's weird. Use the same template
   * we have in WaniKani and JLPT Explorer."
   *
   * So the collection address opens the explorer at the member's own level,
   * the way the other two explorers open on filters and results. The index of
   * a hundred cards is gone; the ladder's shape is what the papers are for.
   */
  it("opens the explorer where the reader is, with no index of a hundred cards", () => {
    const page = readFileSync(`${DIR}/page.tsx`, "utf8");
    expect(page).toContain("deriveUnLevel");
    expect(page).toContain("clampLadderLevel");
    expect(existsSync(`${DIR}/UmakumaLadderIndex.tsx`)).toBe(false);
  });

  /*
   * The picker did not wrap, on the reasoning the app header uses. That does
   * not survive a hundred chips: the row scrolled and showed levels 1 to 21.
   * John, twice: wrap it like the JLPT filter, and group in tens with a group
   * opening on a click, "like a zoom... we do this in the Wanikani filter".
   */
  it("wraps the picker and opens one decade at a time", () => {
    const picker = readFileSync(`${DIR}/UmakumaLevelPicker.tsx`, "utf8");
    expect(picker).toContain("flex-wrap");
    expect(picker).not.toContain("flex-nowrap");
    expect(picker).not.toContain("overflow-x-auto");
    /* Grouped through the shared helper, not a second arrangement of its own. */
    expect(picker).toContain("ladderLevelChips");
  });

  /* John: "You can link to the articles we have created for UmaKuma as they
     are interesting." One constant for the address, so the doc that records
     what the papers say and the page that links them move together. */
  it("links the curriculum papers from the explorer", () => {
    expect(readFileSync(`${DIR}/UmakumaLevelBoard.tsx`, "utf8")).toContain("UmakumaPapersNote");
    expect(readFileSync(`${DIR}/UmakumaPapersNote.tsx`, "utf8")).toContain("CURRICULUM_PAPERS_URL");
    expect(readFileSync("docs/CURRICULUM_PAPERS.md", "utf8")).toContain(CURRICULUM_PAPERS_URL);
  });
});
