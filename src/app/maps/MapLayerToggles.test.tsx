import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ALL_MARK_LAYERS } from "@/lib/mapMarks";

import MapLayerToggles from "./MapLayerToggles";
import { MAP_MARK_COPY } from "./MapStudy.constants";

const totals = { known: 6, practice: 6, visited: 3 };

function draw(layers = ALL_MARK_LAYERS): Document {
  const markup = renderToStaticMarkup(
    <MapLayerToggles totals={totals} layers={layers} total={47} onToggle={() => undefined} />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/*
 * The tally became three switches. Each still says its number, so turning a
 * layer off hides the paint and keeps the count.
 */
describe("the layer switches above the map", () => {
  it("offers one switch per kind of mark, each with its count", () => {
    const buttons = [...draw().querySelectorAll("button")];
    expect(buttons.map((button) => button.textContent)).toEqual([
      MAP_MARK_COPY.layer.known(6),
      MAP_MARK_COPY.layer.practice(6),
      MAP_MARK_COPY.layer.visited(3),
    ]);
    expect(draw().body.textContent).toContain(MAP_MARK_COPY.ofTotal(47));
  });

  it("says which are on", () => {
    const pressed = [...draw({ ...ALL_MARK_LAYERS, practice: false }).querySelectorAll("button")].map((button) =>
      button.getAttribute("aria-pressed"),
    );
    expect(pressed).toEqual(["true", "false", "true"]);
  });

  it("keeps the count when a layer is off", () => {
    const off = draw({ known: false, practice: false, visited: false });
    expect(off.body.textContent).toContain(MAP_MARK_COPY.layer.known(6));
  });
});
