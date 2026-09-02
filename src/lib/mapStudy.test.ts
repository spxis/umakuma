import { describe, expect, it } from "vitest";

import { GEO_DATASETS } from "./geoRegion";
import { FACT_HEADINGS, regionFacts, regionKanji, regionsInOrder } from "./mapStudy";

const tokyo = GEO_DATASETS.JP.regions.find((region) => region.code === 13)!;
const california = GEO_DATASETS.US.regions.find((region) => region.code === "CA")!;

describe("the regions in reading order", () => {
  it("runs Japan north to south, by prefecture code", () => {
    const codes = regionsInOrder("JP").map((region) => region.code);
    expect(codes.slice(0, 3)).toEqual([1, 2, 3]);
    expect(codes.at(-1)).toBe(47);
  });

  it("lists the others by name", () => {
    const names = regionsInOrder("US").map((region) => region.name);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right, "en")));
  });
});

describe("what the panel says about a region", () => {
  it("puts the Japanese beside the English for a prefecture", () => {
    const groups = regionFacts(tokyo);
    const glance = groups.find((group) => group.heading === FACT_HEADINGS.glance)!;
    expect(glance.facts?.[0]).toEqual({ label: "Capital", value: "Shinjuku", native: "新宿区" });
    const foods = groups.find((group) => group.heading === FACT_HEADINGS.foods)!;
    expect(foods.items?.[0]).toBe("Edomae Sushi");
    expect(foods.itemsNative?.[0]).toBe("江戸前寿司");
  });

  it("gives a state its own facts, and no empty Japanese twin", () => {
    const groups = regionFacts(california);
    const glance = groups.find((group) => group.heading === FACT_HEADINGS.glance)!;
    expect(glance.facts?.some((row) => row.label === "Admitted" && row.value === "1850")).toBe(true);
    expect(groups.find((group) => group.heading === FACT_HEADINGS.foods)?.itemsNative).toBeUndefined();
    expect(groups.find((group) => group.heading === FACT_HEADINGS.people)).toBeUndefined();
  });

  it("drops a group with nothing in it rather than showing an empty heading", () => {
    for (const region of GEO_DATASETS.CA.regions) {
      for (const group of regionFacts(region)) {
        expect((group.facts?.length ?? 0) + (group.items?.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  it("knows the kanji a prefecture is written with", () => {
    expect(regionKanji(tokyo)).toEqual(["東", "京"]);
    expect(regionKanji(california)).toEqual([]);
  });
});
