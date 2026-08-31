import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const GRADES = "src/app/users/[nickname]/grades/GradeKanjiBoard.tsx";
const JLPT = "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerContent.tsx";
const WANIKANI = "src/app/users/[nickname]/level-explorer/lib/useLevelExplorerBulkSelection.ts";

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
  it("has the WaniKani explorer share the range maths", () => {
    const source = read(WANIKANI);
    expect(source).toContain("selectionRange");
    expect(source).not.toContain("Math.min(bulkAnchorIndex");
    // An id survives a filter change; an index into the visible list does not.
    expect(source).toContain("bulkAnchorId");
  });
});
