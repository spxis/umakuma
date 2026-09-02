import { describe, expect, it } from "vitest";

import { LIVE_LISTS, LIVE_LIST_SOURCES, liveListByKey, liveListHref, liveListsBySource } from "./liveLists";

describe("the lists nobody owns", () => {
  it("covers the JLPT, the school grades and every WaniKani level", () => {
    const counts = Object.fromEntries(liveListsBySource().map((group) => [group.source, group.lists.length]));
    expect(counts).toEqual({ jlpt: 5, grade: 7, wk: 60 });
  });

  it("gives each one an address of its own, outside anybody's pages", () => {
    expect(liveListHref("jlpt-n5")).toBe("/lists/jlpt-n5");
    expect(liveListByKey("jlpt-n5")?.name).toBe("JLPT N5");
    expect(liveListByKey("grade-1")?.name).toBe("Grade 1 kanji");
    /* Grade 8 in the catalogue is the junior-high set, which is not a year. */
    expect(liveListByKey("grade-8")?.name).toBe("Junior high kanji");
    expect(liveListByKey("wk-12")?.level).toBe(12);
  });

  it("reads a key however it was typed, and refuses one that names nothing", () => {
    expect(liveListByKey("JLPT-N5")?.key).toBe("jlpt-n5");
    expect(liveListByKey("wk-61")).toBeNull();
    expect(liveListByKey("grade-7")).toBeNull();
    expect(liveListByKey("")).toBeNull();
    expect(liveListByKey(null)).toBeNull();
  });

  it("keeps every key distinct, since the key is the address", () => {
    expect(new Set(LIVE_LISTS.map((list) => list.key)).size).toBe(LIVE_LISTS.length);
  });

  it("runs the JLPT from the easiest level to the hardest", () => {
    const jlpt = LIVE_LISTS.filter((list) => list.source === LIVE_LIST_SOURCES.jlpt);
    expect(jlpt.map((list) => list.level)).toEqual([5, 4, 3, 2, 1]);
  });
});
