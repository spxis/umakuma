import { describe, expect, it } from "vitest";

import { kanjiByStrokeCount } from "./strokeBrowser";
import { narrowByRadicals, runRadicalSearch } from "./radicalSearchServer";

/*
 * John, on /strokes/17 with 49 kanji on it and 226 at twelve strokes: "we
 * have a massive amount of results still... this will be great if browsing
 * kanji and you wanted to find all the 17 stroke kanji with a MOUTH radical."
 *
 * The promise the page makes is the one worth pinning: nothing it offers can
 * return nothing, which means every option is measured against what is
 * actually on the page rather than against the dictionary at large.
 */
const seventeen = () => kanjiByStrokeCount(17).map((entry) => entry.kanji);

describe("a second filter over what the first one left", () => {
  it("keeps only the kanji that have the part", () => {
    const pool = seventeen();
    const { kept } = narrowByRadicals(pool, ["口"]);

    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(pool.length);
    for (const kanji of kept) expect(pool).toContain(kanji);
  });

  it("offers nothing that would empty the page", () => {
    const pool = seventeen();
    const { usable } = narrowByRadicals(pool, []);

    /* Every offered part, applied on its own, still leaves something. */
    for (const radical of usable) {
      expect(narrowByRadicals(pool, [radical]).kept.length).toBeGreaterThan(0);
    }
  });

  it("measures against the page, not the dictionary", () => {
    const pool = seventeen();
    const { usable, groups } = narrowByRadicals(pool, []);
    const every = groups.flatMap((group) => group.radicals);

    /* Most of the 253 are dead ends among 49 kanji - that is the point. */
    expect(usable.size).toBeLessThan(every.length);
    /* And a part that is a dead end here is one the whole dictionary has. */
    const dead = every.filter((radical) => !usable.has(radical));
    expect(dead.length).toBeGreaterThan(0);
    for (const radical of dead.slice(0, 20)) {
      expect(narrowByRadicals(pool, [radical]).kept).toHaveLength(0);
    }
  });

  it("keeps a chosen part pickable, so it can be taken back", () => {
    const pool = seventeen();
    const { chosen, usable } = narrowByRadicals(pool, ["口"]);
    expect(chosen).toEqual(["口"]);
    expect(usable.has("口")).toBe(true);
  });

  it("narrows again with a second part, and never widens", () => {
    const pool = seventeen();
    const one = narrowByRadicals(pool, ["口"]);
    const next = [...one.usable].find((radical) => radical !== "口")!;
    const two = narrowByRadicals(pool, ["口", next]);

    expect(two.kept.length).toBeGreaterThan(0);
    expect(two.kept.length).toBeLessThanOrEqual(one.kept.length);
    expect(two.usable.size).toBeLessThanOrEqual(one.usable.size);
  });

  it("hands back the pool untouched when nothing is picked", () => {
    const pool = seventeen();
    expect(narrowByRadicals(pool, []).kept).toEqual(pool);
  });
});

/*
 * The mirror, on /radicals: parts chosen first, then a stroke count. John:
 * "and do the same for the Radicals viewer! Add a stroke filter that can
 * further help reduce the number of kanji you see."
 */
describe("the same idea, the other way round", () => {
  it("offers only the counts its answers actually take", async () => {
    const { strokeChoices, poolMatches } = await runRadicalSearch(["人", "十"]);

    expect(strokeChoices.length).toBeGreaterThan(1);
    for (const choice of strokeChoices) expect(choice.count).toBeGreaterThan(0);
    /* Every answer is counted exactly once, so the chips add up to the page. */
    expect(strokeChoices.reduce((total, choice) => total + choice.count, 0)).toBe(poolMatches);
  });

  it("keeps only the kanji written in the count that was picked", async () => {
    const all = await runRadicalSearch(["人", "十"]);
    const first = all.strokeChoices[0]!;
    const narrowed = await runRadicalSearch(["人", "十"], { strokes: first.strokes });

    expect(narrowed.totalMatches).toBe(first.count);
    expect(narrowed.poolMatches).toBe(all.totalMatches);
    for (const match of narrowed.matches) expect(match.strokeCount).toBe(first.strokes);
  });

  it("ignores a count nothing takes rather than emptying the page", async () => {
    const narrowed = await runRadicalSearch(["人", "十"], { strokes: 29 });
    expect(narrowed.strokes).toBeNull();
    expect(narrowed.totalMatches).toBeGreaterThan(0);
  });

  /* The two filters narrow each other. A part that has nothing left at the
     chosen count is a dead end there, whatever the dictionary says. */
  it("dims the parts that have nothing left at the chosen count", async () => {
    const all = await runRadicalSearch(["人", "十"]);
    const one = all.strokeChoices[0]!;
    const narrowed = await runRadicalSearch(["人", "十"], { strokes: one.strokes });

    expect(narrowed.usable.length).toBeLessThanOrEqual(all.usable.length);
    for (const radical of narrowed.usable.slice(0, 12)) {
      const next = await runRadicalSearch(["人", "十", radical], { strokes: one.strokes });
      expect(next.totalMatches).toBeGreaterThan(0);
    }
  });
});
