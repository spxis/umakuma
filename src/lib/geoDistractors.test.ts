import { describe, expect, it } from "vitest";

import {
  GEO_DISTRACTOR_SCORES,
  geoDistractorScore,
  geoMapDiagonal,
  geoRegionToScorable,
  type GeoScorable,
} from "./geoDistractors";
import { getGeoRegionsByCountry, type CountryCode } from "./geoRegion";

const DIAGONAL = 1000;

function scorable(overrides: Partial<GeoScorable> = {}): GeoScorable {
  return { code: "X", region: "North", centroid: [0, 0], neighbors: [], ...overrides };
}

describe("geoDistractorScore", () => {
  it("rewards a land neighbour most", () => {
    const target = scorable({ code: "A", neighbors: ["B"] });
    const neighbour = scorable({ code: "B", region: "South", centroid: [DIAGONAL, 0] });
    const stranger = scorable({ code: "C", region: "South", centroid: [DIAGONAL, 0] });
    expect(geoDistractorScore(target, neighbour, DIAGONAL) - geoDistractorScore(target, stranger, DIAGONAL))
      .toBe(GEO_DISTRACTOR_SCORES.neighbor);
  });

  it("rewards sharing a region", () => {
    const target = scorable({ code: "A", region: "North" });
    const sameRegion = scorable({ code: "B", region: "North", centroid: [DIAGONAL, 0] });
    const otherRegion = scorable({ code: "C", region: "South", centroid: [DIAGONAL, 0] });
    expect(geoDistractorScore(target, sameRegion, DIAGONAL) - geoDistractorScore(target, otherRegion, DIAGONAL))
      .toBe(GEO_DISTRACTOR_SCORES.region);
  });

  it("prefers what is nearer when nothing else separates them", () => {
    const target = scorable({ code: "A", region: "North" });
    const near = scorable({ code: "B", region: "South", centroid: [10, 0] });
    const far = scorable({ code: "C", region: "South", centroid: [900, 0] });
    expect(geoDistractorScore(target, near, DIAGONAL)).toBeGreaterThan(geoDistractorScore(target, far, DIAGONAL));
  });

  /*
   * Prefecture codes are numbers and state codes are two letters, so a neighbour
   * list can hold either. Comparing them as text keeps one rule working for both
   * rather than silently scoring every neighbour as a stranger.
   */
  it("matches a neighbour whether the code is a number or a string", () => {
    const numeric = geoDistractorScore(scorable({ code: 1, neighbors: [2] }), scorable({ code: 2 }), DIAGONAL);
    const textual = geoDistractorScore(scorable({ code: "1", neighbors: ["2"] }), scorable({ code: "2" }), DIAGONAL);
    const mixed = geoDistractorScore(scorable({ code: 1, neighbors: [2] }), scorable({ code: "2" }), DIAGONAL);
    expect(numeric).toBe(textual);
    expect(mixed).toBe(numeric);
  });

  it("never scores below zero when the map has no size", () => {
    expect(geoDistractorScore(scorable(), scorable({ code: "Z", region: "South" }), 0)).toBe(0);
  });
});

describe("dataset regions as scorables", () => {
  it.each(["JP", "US", "CA"] as CountryCode[])("converts every %s region", (country) => {
    for (const region of getGeoRegionsByCountry(country)) {
      const converted = geoRegionToScorable(region);
      expect(converted.centroid).toHaveLength(2);
      expect(Array.isArray(converted.neighbors)).toBe(true);
    }
  });

  it("gives each country its own map diagonal to measure against", () => {
    for (const country of ["JP", "US", "CA"] as CountryCode[]) {
      expect(geoMapDiagonal(country)).toBeGreaterThan(0);
    }
  });

  it("ranks a real neighbour above a distant region", () => {
    const states = getGeoRegionsByCountry("US");
    const oregon = states.find((state) => state.code === "OR");
    const california = states.find((state) => state.code === "CA");
    const florida = states.find((state) => state.code === "FL");
    if (!oregon || !california || !florida) throw new Error("missing fixture states");

    const diagonal = geoMapDiagonal("US");
    expect(geoDistractorScore(geoRegionToScorable(california), geoRegionToScorable(oregon), diagonal))
      .toBeGreaterThan(geoDistractorScore(geoRegionToScorable(california), geoRegionToScorable(florida), diagonal));
  });
});
