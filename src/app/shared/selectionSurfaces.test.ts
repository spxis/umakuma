import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const GRADES = "src/app/users/[nickname]/grades/GradeKanjiBoard.tsx";
const JLPT = "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerContent.tsx";
const WANIKANI = "src/app/users/[nickname]/level-explorer/lib/useLevelExplorerBulkSelection.ts";
const STUDY = "src/app/users/[nickname]/study-explorer/lib/useStudyBulkReset.ts";

/*
 * Choosing characters is one behaviour, wherever it is offered.
 *
 * It began in the grade explorer, written into that board: the bar, the two
 * destinations, the range maths. The JLPT explorer could not offer selection
 * without copying all of it, and the WaniKani explorer had already copied the
 * range maths into a hook of its own - with an anchor stored as an index into
 * the visible list, which stops meaning anything the moment a filter changes.
 */
describe("choosing, across the surfaces that offer it", () => {
  it.each([
    ["the grade explorer", GRADES],
    ["the JLPT explorer", JLPT],
  ])("gives %s the shared bar rather than its own", (_label, path) => {
    const source = read(path);
    expect(source).toContain("KanjiSelectionBar");
    // The destinations live in the bar now; neither surface rebuilds them.
    expect(source).not.toContain("SaveSelectionAsList");
    expect(source).not.toContain("encodeSelection");
  });

  it.each([
    ["the grade explorer", GRADES],
    ["the JLPT explorer", JLPT],
  ])("lets %s sweep a range with shift", (_label, path) => {
    expect(read(path)).toContain("extendTo");
  });

  /*
   * The WaniKani explorer keeps its own hook - it selects subject ids and
   * carries bulk operations the other two have no use for - but the maths of
   * "everything between these two" is not its to own.
   */
  it.each([
    ["the WaniKani explorer", WANIKANI],
    ["the study explorer", STUDY],
  ])("has %s share the range maths", (_label, path) => {
    const source = read(path);
    expect(source).toContain("selectionRange");
    // An id survives a filter change; an index into the visible list does not.
    expect(source).toContain("bulkAnchorId");
    expect(source).not.toContain("bulkAnchorIndex");
  });

  /*
   * Every surface that draws a grid or a list. The shared row and card pair
   * covers study history and the tagged lists between them, so those two are
   * checked through it rather than each having its own wiring.
   */
  it.each([
    ["rows", "src/app/shared/SubjectRows.tsx"],
    ["cards", "src/app/shared/SubjectCards.tsx"],
  ])("lets the shared %s be chosen from", (_label, path) => {
    const source = read(path);
    expect(source).toContain("selection?: SubjectSelection");
    expect(source).toContain("extendTo");
  });
});

const BULK_PANEL = "src/app/users/[nickname]/shared/ExplorerBulkSelectionPanel.tsx";
const STUDY_PANEL = "src/app/users/[nickname]/study-explorer/components/StudyExplorerPanel.tsx";
const LEVEL_GRID = "src/app/users/[nickname]/level-explorer/components/LevelExplorerItemsGrid.tsx";

/*
 * Somewhere for a bulk selection to go.
 *
 * There are two ways to choose on this site: the shared `useSubjectSelection`,
 * and the bulk mode the study and level explorers run for their own reasons.
 * The first had destinations from the day it was built - save it as a list,
 * print it as a sheet - and the second had none, so a member could gather
 * forty items on the study explorer and then only clear them again.
 *
 * The destinations belong to the act of choosing rather than to either
 * mechanism, so they live on the shared panel and both explorers pass them.
 */
describe("what a bulk selection can become", () => {
  it("offers both destinations from the shared panel", () => {
    const source = read(BULK_PANEL);
    expect(source).toContain("SaveSelectionAsList");
    expect(source).toContain("SUBJECT_SELECTION_COPY.practise");
  });

  it.each([
    ["the study explorer", STUDY_PANEL],
    ["the level explorer", LEVEL_GRID],
  ])("hands %s selection those destinations", (_label, path) => {
    const source = read(path);
    expect(source).toContain("destinations={{");
    expect(source).toContain("practicePath");
  });

  /*
   * A practice sheet is squares to write kanji in. A study queue is radicals
   * and vocabulary as well, so the list keeps everything chosen and the sheet
   * takes only the kanji - and is withheld entirely when there are none.
   */
  it.each([
    ["the study explorer", STUDY_PANEL],
    ["the level explorer", LEVEL_GRID],
  ])("sends only kanji to the sheet from %s", (_label, path) => {
    const source = read(path);
    expect(source).toMatch(/practiceCharacters:[\s\S]{0,200}SUBJECT_TYPES\.kanji/);
  });

  it("withholds the sheet when nothing chosen can go on one", () => {
    expect(read(BULK_PANEL)).toContain("destinations.practiceCharacters.length > 0");
  });

  /*
   * Saving is the same act whichever way the choosing was done, so the save
   * control takes characters rather than one mechanism's object. Coupling it to
   * `SubjectSelection` is what kept it off the bulk panel for so long.
   */
  it("keeps saving usable by both ways of choosing", () => {
    const source = read("src/app/shared/SaveSelectionAsList.tsx");
    expect(source).toContain("chosen: Iterable<string>");
    /* On the import, not the word - the comment above the props explains why. */
    expect(source).not.toMatch(/import .*SubjectSelection.* from/);
  });

  /*
   * Three surfaces derived "/users/<who>" from the pathname by hand. A fourth
   * copy is how they drift apart.
   */
  it("derives the member's base path in one place", () => {
    for (const path of [STUDY_PANEL, "src/app/shared/StudyHistoryTable.tsx", "src/app/shared/StudyTagListsModal.tsx"]) {
      const source = read(path);
      expect(source, `${path} should use the shared hook`).toContain("usePracticePath");
      expect(source, `${path} should not rebuild the base path`).not.toContain('.split("/").slice(0, 3)');
    }
  });
});
