import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "./domainConstants";
import { STUDY_LIST_LIMITS, itemsFromText, normalizeListItems } from "./studyListRules";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const ROUTE = "src/app/api/study/[accountId]/lists/route.ts";
const EDITOR = "src/app/users/[nickname]/lists/StudyListItemEditor.tsx";
const CARD = "src/app/users/[nickname]/lists/StudyListCard.tsx";
const CARDS = "src/app/users/[nickname]/lists/StudyListCards.tsx";

/**
 * Changing what is in a saved list.
 *
 * A list was fixed at the moment it was saved. The only way to drop one
 * character was to go back to an explorer, find the other forty, choose them
 * again and save over the name - so in practice nobody edited a list, they
 * built a second one. Renaming shipped first and left this half undone.
 */

describe("the set a list ends up holding", () => {
  const keys = (raw: string) => itemsFromText(raw).map((item) => `${item.kind}:${item.key}`);

  /* Typed and pasted text both go through the same reading, so a handout and a selection reduce the same way. */
  it("reads a run of kanji one by one, and dedupes", () => {
    expect(keys("水火 火土")).toEqual(["kanji:水", "kanji:火", "kanji:土"]);
  });

  it("reads anything with kana in it as a word, never as its kanji", () => {
    expect(keys("水曜日 ありがとう")).toEqual(["kanji:水", "kanji:曜", "kanji:日", "vocabulary:ありがとう"]);
    expect(keys("食べる")).toEqual(["vocabulary:食べる"]);
  });

  it("drops whitespace rather than storing it", () => {
    expect(keys("水 火\n土")).toEqual(["kanji:水", "kanji:火", "kanji:土"]);
  });

  it("splits by code point, so a character outside the BMP survives", () => {
    /* 𠀋 is a four-byte kanji; slicing by UTF-16 unit would halve it. */
    expect(keys("𠀋水")).toEqual(["kanji:𠀋", "kanji:水"]);
  });

  it("tells a kanji from the word written the same way", () => {
    const both = normalizeListItems([
      { kind: LIST_ITEM_KINDS.kanji, key: "上" },
      { kind: LIST_ITEM_KINDS.vocabulary, key: "上" },
      { kind: LIST_ITEM_KINDS.kanji, key: "上" },
    ]);
    expect(both).toHaveLength(2);
  });

  it("stops at the stored cap", () => {
    const many = Array.from({ length: STUDY_LIST_LIMITS.items + 50 }, (_, index) =>
      String.fromCodePoint(0x4e00 + index),
    ).join("");
    expect(itemsFromText(many)).toHaveLength(STUDY_LIST_LIMITS.items);
  });
});

describe("the route that saves an edit", () => {
  const patch = (() => {
    const route = read(ROUTE);
    return route.slice(route.indexOf("export async function PATCH"));
  })();

  it("takes the characters by id rather than by name", () => {
    /*
     * POST addresses a list by name, so it can only ever write to whichever
     * list holds that name. An edit has to reach this list.
     */
    expect(patch).toMatch(/where: \{ id: parsed\.data\.id, accountId \}/);
  });

  it("normalizes them the way saving does", () => {
    expect(patch).toContain("normalizeListItems");
  });

  /*
   * Emptying a list used to be refused on the reasoning that emptying is
   * deleting. A list can now be named before it holds anything, so refusing to
   * empty one while allowing an empty one to be created held in only one
   * direction. Deleting is still its own button, for being rid of the list
   * rather than of its contents.
   */
  it("allows a list to be emptied, since one can be created empty", () => {
    expect(patch).not.toContain("A list needs at least one character");
    expect(patch).toContain("normalizeListItems");
  });

  /* Sending neither field is a caller bug, not a no-op to absorb quietly. */
  it("refuses a change that changes nothing", () => {
    expect(read(ROUTE)).toContain("Nothing to change.");
  });
});

describe("the editor", () => {
  const editor = read(EDITOR);

  /*
   * The characters are already the biggest thing on the card, so they become
   * the control rather than growing one beside them.
   */
  it("makes each character its own button", () => {
    expect(editor).toContain("<button");
    expect(editor).toContain("draft.filter((held) => listItemId(held) !== id)");
  });

  it("names each one for a reader who cannot see it", () => {
    expect(editor).toContain("STUDY_LIST_COPY.removeCharacterLabel");
    expect(editor).toContain("aria-label=");
  });

  /*
   * One request at the end, not one per removal. Taking four characters out a
   * request at a time is four chances to half-apply an edit.
   */
  it("holds a draft and sends it once", () => {
    expect(editor).toContain("useState(items)");
    expect(editor).toContain("onSave(draft)");
  });

  it("lets an empty set be saved, and says what it will do", () => {
    expect(editor).toContain("disabled={saving}");
    expect(editor).toContain("STUDY_LIST_COPY.editEmpty");
  });

  /* Enter in the add field adds; it must not submit the whole edit. */
  it("keeps Enter in the add field to adding", () => {
    const add = editor.slice(editor.indexOf("onKeyDown"));
    expect(add).toContain('event.key !== "Enter"');
    expect(add).toContain("event.preventDefault()");
    expect(add.slice(0, add.indexOf("/>"))).not.toContain("onSave");
  });

  it("stops at the same cap the store enforces", () => {
    expect(editor).toContain("STUDY_LIST_LIMITS.items");
  });
});

describe("the card and the page", () => {
  it("offers the edit beside rename and delete", () => {
    expect(read(CARD)).toContain("STUDY_LIST_COPY.editCharacters");
  });

  /*
   * One editor at a time. Both open at once would put two Save buttons on one
   * card meaning different things.
   */
  it("holds one mode rather than two flags", () => {
    expect(read(CARD)).toContain('useState<"none" | "name" | "characters">');
  });

  /*
   * Not optimistic. A member has just removed characters by hand; showing the
   * shortened list and then restoring them on failure reads as the page
   * putting back what they deliberately took out.
   */
  it("waits for the server before it shows the change", () => {
    const card = read(CARD);
    const save = card.slice(card.indexOf("async function saveItems"));
    expect(save.indexOf("if (!response.ok)")).toBeLessThan(save.indexOf("onItemsChanged("));
  });

  /* The count and the practice sheet are built from the items, so both move. */
  it("carries the edit into the count and the sheet", () => {
    const cards = read(CARDS);
    expect(cards).toContain("edited[list.id] ?? list.items");
    expect(cards).toContain("count: items.length");
  });
});
