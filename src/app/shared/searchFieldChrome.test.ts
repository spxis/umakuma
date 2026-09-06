import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SEARCH_INPUT_CHROME_CLASS } from "./searchFieldChrome";

/**
 * The dropdown arrow at the end of a search box.
 *
 * A `type="search"` input carrying a `list` gets Chrome's picker indicator,
 * which reads as a select the field is not: the suggestions appear as you
 * type, and the arrow opens a list nobody asked for in a shape that exists
 * nowhere else here.
 */
describe("a search field's own furniture", () => {
  it("hides the picker arrow and the browser's clear cross", () => {
    expect(SEARCH_INPUT_CHROME_CLASS).toContain("[&::-webkit-calendar-picker-indicator]:hidden");
    expect(SEARCH_INPUT_CHROME_CLASS).toContain("[&::-webkit-search-cancel-button]:hidden");
  });

  /* Every field that offers suggestions, from the one constant. */
  it.each([
    ["the shared list search", "src/app/shared/ListSearchField.tsx"],
    ["the search bar", "src/app/shared/SearchComboboxField.tsx"],
    ["the grade explorer's own form", "src/app/users/[nickname]/grades/[grade]/page.tsx"],
  ])("draws %s from the shared constant", (_label, path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    expect(source).toContain("SEARCH_INPUT_CHROME_CLASS");
    /* And never spells one of the rules out again beside it. */
    expect(source).not.toContain("[&::-webkit-search-cancel-button]:hidden");
  });
});
