import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { mapCountryGroups } from "@/lib/mapCountries";

import MapCountryPicker from "./MapCountryPicker";

function draw(country: "JP" | "US" | "CA" | "TH", isAdmin: boolean): Document {
  const markup = renderToStaticMarkup(
    <MapCountryPicker country={country} isAdmin={isAdmin} onChoose={() => {}} />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

const labels = (doc: Document) => [...doc.querySelectorAll("button")].map((b) => b.textContent?.trim() ?? "");

/*
 * Japan first, and never a wall of countries.
 *
 * A flat row was fine at three and cramped at seven; at thirty it would put a
 * hedge of buttons between the reader and the map, with the one country the
 * site is about lost somewhere inside it. Japan stands on its own, everywhere
 * else is two clicks away through the part of the world it is in.
 */
describe("the country picker", () => {
  it("offers Japan and a way to the rest, and nothing else at rest", () => {
    expect(labels(draw("JP", false))).toEqual(["Japan", "Other countries"]);
  });

  it("shows where the reader is when it is not Japan", () => {
    /* Otherwise the picker hides the very country it is pointing at. */
    expect(labels(draw("CA", false))).toEqual(["Japan", "Canada", "Other countries"]);
  });

  it("hides the pilot countries from a viewer who may not open them", () => {
    const groups = mapCountryGroups(false);
    const offered = groups.parts.flatMap((g) => g.countries.map((c) => c.code));
    expect(offered).not.toContain("TH");
    expect(offered).not.toContain("CN");
  });

  it("groups the rest by part of the world, dropping the empty ones", () => {
    const publicParts = mapCountryGroups(false).parts.map((g) => g.part);
    expect(publicParts).toEqual(["North America"]);

    const adminParts = mapCountryGroups(true).parts.map((g) => g.part);
    expect(adminParts).toEqual(["Asia", "Oceania", "North America"]);
  });

  it("never puts Japan in a group as well as at the front", () => {
    for (const isAdmin of [false, true]) {
      const groups = mapCountryGroups(isAdmin);
      expect(groups.home.code).toBe("JP");
      expect(groups.parts.flatMap((g) => g.countries.map((c) => c.code))).not.toContain("JP");
    }
  });
});
