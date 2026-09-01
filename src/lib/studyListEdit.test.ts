import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { STUDY_LIST_LIMITS, normalizeListCharacters } from "./studyListRules";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const ROUTE = "src/app/api/study/[accountId]/lists/route.ts";
const EDITOR = "src/app/users/[nickname]/lists/StudyListCharacterEditor.tsx";
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
  /*
   * Removal and addition both go through the normalizer the save path already
   * used, so a pasted sentence and a chosen selection reduce the same way.
   */
  it("dedupes what is added against what is held", () => {
    expect(normalizeListCharacters(["水火", "火土"])).toEqual(["水", "火", "土"]);
  });

  it("drops whitespace rather than storing it as a character", () => {
    expect(normalizeListCharacters(["水 火\n土"])).toEqual(["水", "火", "土"]);
  });

  it("splits by code point, so a character outside the BMP survives", () => {
    /* 𠀋 is a four-byte kanji; slicing by UTF-16 unit would halve it. */
    expect(normalizeListCharacters(["𠀋水"])).toEqual(["𠀋", "水"]);
  });

  it("stops at the stored cap", () => {
    const many = Array.from({ length: STUDY_LIST_LIMITS.characters + 50 }, (_, index) =>
      String.fromCodePoint(0x4e00 + index),
    ).join("");
    expect(normalizeListCharacters([many])).toHaveLength(STUDY_LIST_LIMITS.characters);
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
    expect(patch).toContain("normalizeListCharacters");
  });

  /*
   * Emptying a list is deleting it, and deleting has its own button and its
   * own confirmation. Writing the empty set would leave a named row that
   * practises nothing, which reads as a bug rather than a choice.
   */
  it("refuses to empty a list", () => {
    expect(patch).toContain("characters.length === 0");
    expect(patch).toContain("Delete it instead.");
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
    expect(editor).toContain("draft.filter((held) => held !== character)");
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
    expect(editor).toContain("useState<string[]>(characters)");
    expect(editor).toContain("onSave(draft)");
  });

  it("will not send an empty set", () => {
    expect(editor).toContain("disabled={saving || draft.length === 0}");
  });

  /* Enter in the add field adds; it must not submit the whole edit. */
  it("keeps Enter in the add field to adding", () => {
    const add = editor.slice(editor.indexOf("onKeyDown"));
    expect(add).toContain('event.key !== "Enter"');
    expect(add).toContain("event.preventDefault()");
    expect(add.slice(0, add.indexOf("/>"))).not.toContain("onSave");
  });

  it("stops at the same cap the store enforces", () => {
    expect(editor).toContain("STUDY_LIST_LIMITS.characters");
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
    const save = card.slice(card.indexOf("async function saveCharacters"));
    expect(save.indexOf("if (!response.ok)")).toBeLessThan(save.indexOf("onCharactersChanged("));
  });

  /* The count and the practice sheet are built from the characters, so both move. */
  it("carries the edit into the count and the sheet", () => {
    const cards = read(CARDS);
    expect(cards).toContain("edited[list.id] ?? list.characters");
    expect(cards).toContain("count: characters.length");
  });
});
