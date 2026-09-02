import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "./domainConstants";
import { toListPageItems } from "./listPageItems";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const STORE = "src/lib/studyLists.ts";
const ITEMS_ROUTE = "src/app/api/study/[accountId]/lists/[listId]/items/route.ts";
const CONTRIBUTIONS = "src/lib/studyListContributions.ts";
const MERGE_ROUTE = "src/app/api/study/[accountId]/lists/merge/route.ts";
const BODY = "src/app/shared/StudyTagListsBody.tsx";

/**
 * A note on an item in a list.
 *
 * The note is the reason a member's own list beats a generated one - the
 * mnemonic that finally worked, the sentence it was met in - and the way it can
 * be lost is not obvious: saving a list rewrites every row, so a caller that
 * reads only the columns it cares about erases the notes on every other item
 * the moment somebody removes one.
 */
describe("a note reaches the page it is read on", () => {
  it("rides along from the stored item to the drawn one", () => {
    const [item] = toListPageItems([
      {
        key: "kanji:水",
        kind: LIST_ITEM_KINDS.kanji,
        subjectId: 440,
        readings: ["みず"],
        meanings: ["Water"],
        subjectType: "kanji",
        slug: null,
        glyph: "水",
        meaning: "Water",
        reading: "みず",
        wkLevel: 1,
        href: null,
        note: "the one I keep writing backwards",
      },
    ]);

    expect(item?.note).toBe("the one I keep writing backwards");
  });

  it("draws nothing where nobody wrote one", () => {
    const [item] = toListPageItems([
      {
        key: "kanji:火",
        kind: LIST_ITEM_KINDS.kanji,
        subjectId: 441,
        readings: [],
        meanings: [],
        subjectType: "kanji",
        slug: null,
        glyph: "火",
        meaning: "Fire",
        reading: null,
        wkLevel: 1,
        href: null,
      },
    ]);

    expect(item?.note).toBeNull();
  });

  it("shows the note in both densities from one place", () => {
    const body = read(BODY);

    expect(body).toContain("renderSubMeta={showNote}");
    expect(body).toContain("renderUnder={showNote}");
  });
});

/*
 * The invariant worth a test: a rewrite keeps what it did not set out to
 * change. Every one of these callers reads a list, changes one thing and saves
 * the whole set back, so each must read the columns the save will rewrite.
 */
describe("saving a list keeps the notes on it", () => {
  it("writes the note the item arrived with", () => {
    const store = read(STORE);

    expect(store).toContain("note: item.note ?? null");
    expect(store).toContain("addedByAccountId: item.addedByAccountId ?? addedByAccountId");
  });

  it.each([
    ["taking an item out", ITEMS_ROUTE],
    ["applying a contribution", CONTRIBUTIONS],
    ["merging two lists", MERGE_ROUTE],
  ])("reads the note before it rewrites the rows: %s", (_what, path) => {
    const source = read(path);
    const rewrites = source.includes("replaceListItems(");

    expect(rewrites).toBe(true);

    /*
     * Only the item selects, which is what a rewrite reads back. A proposal
     * row also has a kind and a key and is not a list item.
     */
    const selects = source.match(/items: \{\s*select: \{[^}]*\}/g) ?? [];
    expect(selects.length).toBeGreaterThan(0);
    for (const select of selects) {
      expect(select).toContain("note: true");
    }
  });
});
