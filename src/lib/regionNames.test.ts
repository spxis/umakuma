import { describe, expect, it } from "vitest";

import { regionsInOrder } from "./mapStudy";
import { regionNameLabel, regionNameLines } from "./regionNames";

const find = (country: "JP" | "US" | "CA", name: string) => {
  const region = regionsInOrder(country).find((entry) => entry.name === name);
  if (!region) throw new Error(`no ${name} in ${country}`);
  return region;
};

/**
 * Every dataset carries a second name, and the map surfaces treated all of
 * them as Japanese: an English site led its Canadian rows with
 * Colombie-Britannique and tagged the text `lang="ja"`.
 */
describe("what to call a region", () => {
  it("leads with the Japanese, because that is the thing being learned", () => {
    const names = regionNameLines(find("JP", "Hokkaido"));
    expect(names.lead).toBe("北海道");
    expect(names.leadLang).toBe("ja");
    expect(names.sub).toBe("Hokkaido");
  });

  it("leads with English in Canada, and does not offer the French at all", () => {
    const names = regionNameLines(find("CA", "British Columbia"));
    expect(names.lead).toBe("British Columbia");
    expect(names.leadLang).toBeNull();
    expect(names.sub).toBeNull();
  });

  /* The bug that made it a screen-reader problem, not only a copy one. */
  it("never tags a language on a name that is already the site's", () => {
    for (const country of ["US", "CA"] as const) {
      for (const region of regionsInOrder(country)) {
        expect(regionNameLines(region).leadLang, region.name).toBeNull();
      }
    }
  });

  it("writes one line for a pointer, with the gloss only where there is one", () => {
    expect(regionNameLabel(find("JP", "Hokkaido"))).toBe("北海道 Hokkaido");
    expect(regionNameLabel(find("CA", "Alberta"))).toBe("Alberta");
    expect(regionNameLabel(find("US", "Ohio"))).toBe("Ohio");
  });
});
