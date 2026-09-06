import { describe, expect, it } from "vitest";

import { confusableViewsFor } from "./kanjiConfusablesView";

/*
 * The join: pairs from one file, meanings and readings from KANJIDIC2, levels
 * from the ladder. Nothing is copied between them, so this is where a rename
 * in any of the three would show up.
 */
describe("a pairing, ready to draw", () => {
  const twins = confusableViewsFor("土");
  const shi = twins.find((view) => view.kanji === "士");

  it("names the twin, and where the ladder teaches it", () => {
    expect(shi).toBeDefined();
    expect(shi!.href).toBe(`/kanji/${encodeURIComponent("士")}`);
    /* The actionable half: a member meeting 士 has known 土 for 47 levels. */
    expect(shi!.unLevel).toBeGreaterThan(20);
  });

  it("takes the meaning and the reading from the dictionary", () => {
    expect(shi!.meaning?.length).toBeGreaterThan(0);
    expect(shi!.reading).toBeTruthy();
    /* KANJIDIC2 marks okurigana with a dot; a reader wants the reading. */
    expect(shi!.reading).not.toContain(".");
  });

  it("keeps the file's order and its provenance", () => {
    expect(twins[0]!.kanji).toBe("士");
    expect(twins[0]!.sources.length).toBeGreaterThan(0);
  });

  /*
   * The 134 joyo kanji WaniKani never teaches have no catalogue row, which is
   * the whole reason this reads files instead of the database.
   */
  it("answers for a character WaniKani does not teach", () => {
    const views = confusableViewsFor("苺");
    for (const view of views) expect(view.href).toContain("/kanji/");
  });

  it("draws nothing for a character with no pairing", () => {
    expect(confusableViewsFor("q")).toEqual([]);
  });
});
