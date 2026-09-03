import { describe, expect, it, vi } from "vitest";

/* The catalogue is the third source and needs a database; the first two do not. */
vi.mock("./prisma", () => ({ prisma: { wkSubjectCatalog: { findMany: async () => [] } } }));

const { radicalDisplayNames } = await import("./radicalNames");
const { default: file } = await import("@/data/radicals/index.json");

const ALL = (file as { radicals: Array<{ radical: string }> }).radicals.map((entry) => entry.radical);

/*
 * John, on a kanji page: the bar radical doesn't have a name, why doesn't it
 * have one? Because RADKFILE keys six of its radicals on a katakana or a
 * fullwidth bar - ｜ is U+FF5C, not the radical 丨 - and both name sources are
 * keyed on characters that are kanji.
 */
describe("what a radical is called", () => {
  it("names every radical RADKFILE has, with none left blank", async () => {
    const names = await radicalDisplayNames(ALL);
    const unnamed = ALL.filter((radical) => !names.get(radical));
    expect(unnamed, `these radicals would draw with no name: ${unnamed.join(" ")}`).toEqual([]);
  });

  it("names the six the dictionary cannot be asked about", async () => {
    const names = await radicalDisplayNames(["｜", "ノ", "ハ", "マ", "ユ", "ヨ"]);
    expect(names.get("｜")).toBe("line");
    expect(names.get("ハ")).toBe("eight");
    expect(names.get("ヨ")).toBe("snout");
  });

  /* The classical name still wins its own character. */
  it("takes the dictionary's word where there is one", async () => {
    const names = await radicalDisplayNames(["口", "日", "木"]);
    expect(names.get("口")).toBe("mouth");
    expect(names.get("日")).toBe("day");
    expect(names.get("木")).toBe("tree");
  });

  /*
   * Radical to name, which is the direction a surface drawing a radical needs.
   * The grid asked the search index - name to radical - and got nothing back
   * for every cell, so no cell had a title.
   */
  it("is keyed by the radical, not by the name", async () => {
    const names = await radicalDisplayNames(["口"]);
    expect([...names.keys()]).toEqual(["口"]);
    expect(names.get("mouth")).toBeUndefined();
  });

  /* It names what it is given; a character no source knows gets nothing. */
  it("leaves out what none of the three sources knows", async () => {
    const names = await radicalDisplayNames(["Q", "☂"]);
    expect([...names.keys()]).toEqual([]);
  });
});
