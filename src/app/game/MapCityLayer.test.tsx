import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { MapCity } from "@/lib/geoCities";

import MapCityLayer from "./MapCityLayer";

const city = (over: Partial<MapCity> & { name: string; x: number; y: number }): MapCity => ({
  region: "ON",
  rank: 5,
  capital: null,
  population: 1000,
  ...over,
});

function draw(cities: MapCity[], stroke = 2): Document {
  const markup = renderToStaticMarkup(
    <svg>
      <MapCityLayer cities={cities} stroke={stroke} />
    </svg>,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

describe("the city layer", () => {
  it("draws nothing at all when there are no cities", () => {
    expect(draw([]).querySelector("[data-testid='map-city-layer']")).toBeNull();
  });

  it("gives every city a dot with its name on the title, printed or not", () => {
    const doc = draw([city({ name: "Toronto", x: 100, y: 100 }), city({ name: "Ottawa", x: 400, y: 400 })]);
    const titles = [...doc.querySelectorAll("title")].map((node) => node.textContent);
    expect(titles).toEqual(["Toronto", "Ottawa"]);
  });

  /*
   * A control never contains another control, and the regions under this layer
   * are buttons. A city that took the click would take its province with it.
   */
  it("holds nothing interactive", () => {
    const doc = draw([city({ name: "Toronto", x: 100, y: 100, capital: "region" })]);
    const layer = doc.querySelector("[data-testid='map-city-layer']")!;
    expect(layer.querySelectorAll("button, a, input, [role='button'], [tabindex]")).toHaveLength(0);
  });

  /*
   * Fredericton and Halifax printed over each other as "Frederictonifax" while
   * every city was labelled unconditionally. Placement is greedy in the order
   * given - most important first - so the first one keeps its name and the
   * second goes without.
   */
  it("prints only the first of two names that would land on each other", () => {
    const doc = draw([city({ name: "Halifax", x: 100, y: 100 }), city({ name: "Fredericton", x: 104, y: 100 })]);
    const printed = [...doc.querySelectorAll("text")].map((node) => node.textContent);
    expect(printed).toEqual(["Halifax"]);
  });

  it("prints both when they are far enough apart", () => {
    const doc = draw([city({ name: "Halifax", x: 100, y: 100 }), city({ name: "Fredericton", x: 600, y: 600 })]);
    const printed = [...doc.querySelectorAll("text")].map((node) => node.textContent);
    expect(printed).toEqual(["Halifax", "Fredericton"]);
  });

  /*
   * The label box is measured from `stroke`, which shrinks as the window does,
   * so zooming in spreads the same cities apart and more of them find room.
   * Verified on the real data too: 105 names at whole-country zoom, 181 framed
   * on Atlantic Canada.
   */
  it("finds room for more names as the map zooms in", () => {
    const crowd = [
      city({ name: "Alpha", x: 100, y: 100 }),
      city({ name: "Bravo", x: 130, y: 100 }),
      city({ name: "Charlie", x: 160, y: 100 }),
    ];
    const wide = draw(crowd, 4).querySelectorAll("text").length;
    const close = draw(crowd, 1).querySelectorAll("text").length;
    expect(close).toBeGreaterThan(wide);
  });

  it("rings a capital so it reads as one without a legend", () => {
    const plain = draw([city({ name: "Barrie", x: 100, y: 100 })]).querySelectorAll("circle").length;
    const capital = draw([city({ name: "Ottawa", x: 100, y: 100, capital: "country" })]).querySelectorAll("circle").length;
    expect(capital).toBe(plain + 1);
  });
});
