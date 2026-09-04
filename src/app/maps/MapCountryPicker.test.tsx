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

  it("groups the rest by part of the world, in a fixed order", () => {
    const publicParts = mapCountryGroups(false).parts.map((g) => g.part);
    expect(publicParts).toEqual(["Asia", "Oceania", "North America", "South America", "Europe"]);
  });

  /*
   * Nothing is hidden any more. Thailand, China, Australia and Taiwan were
   * admin-only while they were the only generated countries; they are the same
   * Natural Earth data as the other twenty-five now open, so the four had
   * stopped being a category.
   */
  it("offers every country to everyone", () => {
    const asAdmin = mapCountryGroups(true).parts.flatMap((g) => g.countries.map((c) => c.code));
    const asReader = mapCountryGroups(false).parts.flatMap((g) => g.countries.map((c) => c.code));
    expect(asReader).toEqual(asAdmin);
    for (const code of ["TH", "CN", "AU", "TW", "FR", "BR", "KR"]) {
      expect(asReader).toContain(code);
    }
  });

  it("never puts Japan in a group as well as at the front", () => {
    for (const isAdmin of [false, true]) {
      const groups = mapCountryGroups(isAdmin);
      expect(groups.home.code).toBe("JP");
      expect(groups.parts.flatMap((g) => g.countries.map((c) => c.code))).not.toContain("JP");
    }
  });
});
