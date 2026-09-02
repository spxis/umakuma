import { describe, expect, it } from "vitest";

import { kanjiForRadicals, orderChosen, radicalGroups, usableRadicals, type RadicalEntry } from "./radicalSearch";

/*
 * A small grid standing in for the 253, and true to the characters: 日 is in
 * 明, 時 and 朝; 月 is in 明 and 朝; 寺 is in 時 alone. So 日 with 寺 is 時 and
 * nothing else, while 日 with 月 is the two that hold both.
 */
const ENTRIES: RadicalEntry[] = [
  { radical: "一", strokes: 1, kanji: "明時朝寺" },
  { radical: "日", strokes: 4, kanji: "明時朝" },
  { radical: "月", strokes: 4, kanji: "明朝" },
  { radical: "寺", strokes: 6, kanji: "時" },
];

describe("radicalGroups", () => {
  it("groups the grid by stroke count, fewest first", () => {
    expect(radicalGroups(ENTRIES)).toEqual([
      { strokes: 1, radicals: ["一"] },
      { strokes: 4, radicals: ["日", "月"] },
      { strokes: 6, radicals: ["寺"] },
    ]);
  });
});

describe("kanjiForRadicals", () => {
  it("has nothing to show before anything is picked", () => {
    expect(kanjiForRadicals(ENTRIES, [])).toEqual([]);
  });

  it("lists every kanji holding the one radical", () => {
    expect(kanjiForRadicals(ENTRIES, ["月"])).toEqual(["明", "朝"]);
  });

  /* Every radical narrows: 日 with 寺 is 時 alone, not everything holding either. */
  it("narrows on all of them rather than any of them", () => {
    expect(kanjiForRadicals(ENTRIES, ["日", "寺"])).toEqual(["時"]);
    expect(kanjiForRadicals(ENTRIES, ["日", "月"])).toEqual(["明", "朝"]);
  });

  it("answers nothing when the combination exists in no kanji", () => {
    expect(kanjiForRadicals(ENTRIES, ["月", "寺"])).toEqual([]);
  });

  /* The order is the first radical's, which is the dictionary's own. */
  it("keeps the matches in the order the data holds them", () => {
    expect(kanjiForRadicals(ENTRIES, ["一", "日"])).toEqual(["明", "時", "朝"]);
  });

  it("answers nothing for a radical it does not have", () => {
    expect(kanjiForRadicals(ENTRIES, ["日", "𠮟"])).toEqual([]);
  });
});

describe("usableRadicals", () => {
  it("offers the whole grid before anything is picked", () => {
    expect(usableRadicals(ENTRIES, []).size).toBe(ENTRIES.length);
  });

  /*
   * The dimming is the ergonomics: after 月 only 一, 日 and 月 itself can lead
   * anywhere, so 寺 is dimmed rather than left as a route to an empty list.
   */
  it("keeps only the radicals that can still narrow", () => {
    const usable = usableRadicals(ENTRIES, ["月"]);
    expect([...usable].sort()).toEqual(["一", "日", "月"].sort());
    expect(usable.has("寺")).toBe(false);
  });

  it("always keeps what is chosen, so a choice can be taken back", () => {
    const usable = usableRadicals(ENTRIES, ["月", "寺"]);
    expect(usable.has("月")).toBe(true);
    expect(usable.has("寺")).toBe(true);
  });
});

describe("orderChosen", () => {
  it("reads the picks back in the grid's order, not the order they were clicked", () => {
    expect(orderChosen(ENTRIES, ["寺", "日"])).toEqual(["日", "寺"]);
  });

  it("drops a radical the grid does not have", () => {
    expect(orderChosen(ENTRIES, ["日", "x"])).toEqual(["日"]);
  });
});
