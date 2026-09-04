import { describe, expect, it } from "vitest";

import { isIndexGloss, ourUsableName, radicalNameView } from "./ukRadicalNames";

describe("whose name a radical wears", () => {
  it("shows ours to everybody and theirs alongside, for a connected member", () => {
    const view = radicalNameView({
      names: { ours: "one", theirs: "Ground" },
      characters: "一",
      canSeeWanikani: true,
    });
    expect(view).toEqual({ primary: "one", secondary: "Ground", fromWanikani: false });
  });

  it("never shows WaniKani's name to somebody without a WaniKani account", () => {
    /* Their radical names are their invention and their content, the same as
       their mnemonics. Ground, Moon, Fins, Triceratops are theirs. */
    const view = radicalNameView({
      names: { ours: "month", theirs: "Moon" },
      characters: "月",
      canSeeWanikani: false,
    });
    expect(view).toEqual({ primary: "month", secondary: null, fromWanikani: false });
  });

  it("falls back to theirs when we have no name and the member may see it", () => {
    const view = radicalNameView({ names: { ours: null, theirs: "Fins" }, characters: "ハ", canSeeWanikani: true });
    expect(view).toEqual({ primary: "Fins", secondary: null, fromWanikani: true });
  });

  it("prints the character rather than borrowing a word we may not use", () => {
    /* An honest blank beats a borrowed name. */
    const view = radicalNameView({ names: { ours: null, theirs: "Fins" }, characters: "ハ", canSeeWanikani: false });
    expect(view).toEqual({ primary: "ハ", secondary: null, fromWanikani: false });
  });

  it("treats the dictionary's own bookkeeping as no name at all", () => {
    /* RADKFILE labels 冂 "upside-down box radical (no. 13)". That is the index
       describing its numbering; printed at a learner it reads as a name and
       teaches a wrong one. */
    expect(isIndexGloss("upside-down box radical (no. 13)")).toBe(true);
    expect(isIndexGloss("legs radical (no. 10)")).toBe(true);
    expect(isIndexGloss("katakana hi radical")).toBe(true);
    expect(isIndexGloss("mountain")).toBe(false);
  });

  it("takes the usable sense out of a gloss that has one", () => {
    expect(ourUsableName("spoon, spoon or katakana hi radical")).toBe("spoon");
    expect(ourUsableName("divining, fortune-telling, divination")).toBe("divining");
    expect(ourUsableName("upside-down box radical (no. 13)")).toBeNull();
  });

  it("falls through to theirs when ours is only bookkeeping", () => {
    const view = radicalNameView({
      names: { ours: "upside-down box radical (no. 13)", theirs: "Head" },
      characters: "冂",
      canSeeWanikani: true,
    });
    expect(view.primary).toBe("Head");
    expect(view.fromWanikani).toBe(true);
  });
});
