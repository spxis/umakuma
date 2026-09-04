import { describe, expect, it } from "vitest";

import { getGeoRegionsByCountry } from "./geoRegion";
import { isCuratedMapCountry } from "./mapCountries";
import { FACT_LABELS, regionFacts } from "./mapStudy";

const glance = (country: Parameters<typeof getGeoRegionsByCountry>[0], code: string) => {
  const region = getGeoRegionsByCountry(country).find((r) => String(r.code) === code)!;
  const group = regionFacts(region).find((g) => g.id === "glance");
  return Object.fromEntries((group?.facts ?? []).map((f) => [f.label, f.value]));
};

/*
 * Only what we know to be true.
 *
 * The twenty-five countries opened for reading were generated from Natural
 * Earth boundaries, which carry no capital, population or area at all. The
 * builder filled the gaps anyway - the capital with the division's own name,
 * or with whatever `name_alt` held, and the rest with zero - so the panel
 * printed "Capital: Aisne" and "Population 0" as fact. France's Ain was given
 * the capital "Rhone-Alpes", which is a region and not a city.
 *
 * A blank row is honest. An invented one is not, and these are the assertions
 * that keep it that way.
 */
describe("a generated country's facts", () => {
  it("never repeats the region's own name back as its capital", () => {
    for (const region of getGeoRegionsByCountry("FR")) {
      const facts = regionFacts(region).find((g) => g.id === "glance");
      const capital = facts?.facts?.find((f) => f.label === FACT_LABELS.capital)?.value;
      if (capital) expect(capital).not.toBe(region.name);
    }
  });

  it("prints no population or area it does not have", () => {
    for (const code of ["01", "02", "03"]) {
      const facts = glance("FR", code);
      expect(facts[FACT_LABELS.population]).toBeUndefined();
      expect(facts[FACT_LABELS.area]).toBeUndefined();
    }
  });

  it("says nothing about a capital Natural Earth does not mark", () => {
    /* Ain's was "Rhone-Alpes" - a region wearing a city's label. */
    expect(glance("FR", "01")[FACT_LABELS.capital]).toBeUndefined();
  });

  it("still shows the region it belongs to, which is true", () => {
    expect(glance("FR", "01")[FACT_LABELS.region]).toBeTruthy();
  });
});

describe("a curated country's facts", () => {
  it("keeps every one of them", () => {
    const fukushima = glance("JP", "7");
    expect(fukushima[FACT_LABELS.capital]).toBeTruthy();
    expect(fukushima[FACT_LABELS.population]).toBeTruthy();
    expect(fukushima[FACT_LABELS.area]).toBeTruthy();
  });

  it("is exactly the three countries somebody has written facts for", () => {
    expect(["JP", "US", "CA"].every(isCuratedMapCountry)).toBe(true);
    expect(["FR", "BR", "TH", "GB"].some(isCuratedMapCountry)).toBe(false);
  });
});
