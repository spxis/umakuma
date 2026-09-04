import { describe, expect, it } from "vitest";

import { MAP_ZOOM_LEVELS, geoWholeCountryBox, geoZoomBox, stepMapZoom, type MapZoom } from "@/lib/geoMapFraming";

/*
 * Double-clicking zooms where the pointer is, and leaves it there.
 *
 * It used to re-centre on the double-clicked region's centroid, which threw
 * the map sideways: you asked to look closer at a coastline and the country
 * slid so a point you cannot see could sit in the middle. The arithmetic that
 * fixes it is four lines in `useMapZoom`, and this is the property those four
 * lines exist to hold - the spot under the pointer does not move.
 */
const COUNTRY = "JP" as const;

/** The same maths `zoomAtPoint` does, over a box rather than a DOM event. */
function zoomAt(zoom: MapZoom, centre: { x: number; y: number }, fx: number, fy: number, by: 1 | -1) {
  const box = geoZoomBox(COUNTRY, zoom, centre, true);
  const next = stepMapZoom(zoom, by);
  const mapX = box.x + fx * box.width;
  const mapY = box.y + fy * box.height;
  const whole = geoWholeCountryBox(COUNTRY);
  const nextWidth = whole.width / next;
  const nextHeight = whole.height / next;
  return {
    zoom: next,
    centre: { x: mapX + nextWidth * (0.5 - fx), y: mapY + nextHeight * (0.5 - fy) },
    pointed: { x: mapX, y: mapY },
  };
}

describe("zooming where the pointer is", () => {
  it("keeps the spot under the pointer in the same place on screen", () => {
    const centre = { x: 500, y: 553.95 };
    /* Two thirds across and a quarter down: nowhere near the middle, which is
       the case the old behaviour got wrong. */
    const [fx, fy] = [0.66, 0.25];
    const before = geoZoomBox(COUNTRY, 1, centre, true);
    const pointed = { x: before.x + fx * before.width, y: before.y + fy * before.height };

    const after = zoomAt(1, centre, fx, fy, 1);
    const box = geoZoomBox(COUNTRY, after.zoom, after.centre, false);

    /* Same fraction across the new window as it was across the old one. */
    expect((pointed.x - box.x) / box.width).toBeCloseTo(fx, 6);
    expect((pointed.y - box.y) / box.height).toBeCloseTo(fy, 6);
  });

  it("steps one level at a time rather than jumping to the end", () => {
    const centre = { x: 500, y: 553.95 };
    let zoom: MapZoom = MAP_ZOOM_LEVELS[0];
    const seen: MapZoom[] = [zoom];
    for (let i = 0; i < 4; i++) {
      zoom = zoomAt(zoom, centre, 0.5, 0.5, 1).zoom;
      seen.push(zoom);
    }
    expect(seen).toEqual([1, 2, 3, 3, 3]);
  });

  it("goes back out when the reader holds Alt", () => {
    const centre = { x: 500, y: 553.95 };
    const inOnce = zoomAt(1, centre, 0.3, 0.7, 1);
    const backOut = zoomAt(inOnce.zoom, inOnce.centre, 0.3, 0.7, -1);
    expect(backOut.zoom).toBe(1);
  });

  it("does nothing at the far end, rather than moving the map for no reason", () => {
    const atLimit = MAP_ZOOM_LEVELS[MAP_ZOOM_LEVELS.length - 1];
    expect(stepMapZoom(atLimit, 1)).toBe(atLimit);
  });
});
