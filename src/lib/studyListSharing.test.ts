import { describe, expect, it } from "vitest";

import { LIST_VISIBILITIES } from "./domainConstants";
import { canViewList, listHref, listShareHref, listSlug, normalizeListName } from "./studyListRules";

describe("what a list may be called", () => {
  it("keeps letters in any script, digits and a title's punctuation", () => {
    expect(normalizeListName("Week 1 - the hard ones!")).toBe("Week 1 - the hard ones!");
    expect(normalizeListName("今週の漢字・火と水")).toBe("今週の漢字・火と水");
  });

  /* A name is a heading and an address; a stray mark should not become either. */
  it("drops control characters, emoji and symbols rather than refusing the name", () => {
    expect(normalizeListName("Week 1 🔥 <b>")).toBe("Week 1 b");
    expect(normalizeListName("🔥🔥")).toBeNull();
  });

  it("collapses whitespace, so two spellings are one list", () => {
    expect(normalizeListName("  Week   1 \n")).toBe("Week 1");
  });
});

describe("the address a list lives at", () => {
  it("is the name in kebab case, in the owner's pages", () => {
    expect(listSlug("Week 1")).toBe("week-1");
    expect(listSlug("Kanji I keep losing!")).toBe("kanji-i-keep-losing");
    expect(listHref("john", "Week 1")).toBe("/users/john/lists/week-1");
  });

  it("keeps a Japanese name as itself", () => {
    expect(listSlug("今週の漢字")).toBe("今週の漢字");
    expect(listHref("john", "今週の漢字")).toBe(`/users/john/lists/${encodeURIComponent("今週の漢字")}`);
  });

  it("carries the key only for a list that needs one", () => {
    expect(listShareHref("john", "Week 1", LIST_VISIBILITIES.public, "abc")).toBe("/users/john/lists/week-1");
    expect(listShareHref("john", "Week 1", LIST_VISIBILITIES.unlisted, "abc")).toBe("/users/john/lists/week-1?key=abc");
  });
});

describe("who may open a list", () => {
  const stranger = { isOwner: false, isAdmin: false, shareToken: "abc", key: null };

  it("always lets the owner and an admin in", () => {
    expect(canViewList({ ...stranger, visibility: LIST_VISIBILITIES.private, isOwner: true })).toBe(true);
    expect(canViewList({ ...stranger, visibility: LIST_VISIBILITIES.private, isAdmin: true })).toBe(true);
  });

  it("opens a public list to anyone", () => {
    expect(canViewList({ ...stranger, visibility: LIST_VISIBILITIES.public })).toBe(true);
  });

  it("opens an unlisted list only to the key from its link", () => {
    expect(canViewList({ ...stranger, visibility: LIST_VISIBILITIES.unlisted })).toBe(false);
    expect(canViewList({ ...stranger, visibility: LIST_VISIBILITIES.unlisted, key: "abc" })).toBe(true);
    expect(canViewList({ ...stranger, visibility: LIST_VISIBILITIES.unlisted, key: "abd" })).toBe(false);
  });

  it("keeps a private list private, whoever else may see the owner's pages", () => {
    expect(canViewList({ ...stranger, visibility: LIST_VISIBILITIES.private, key: "abc" })).toBe(false);
  });
});
