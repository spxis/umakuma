import { describe, expect, it } from "vitest";

import {
  MAP_ZOOM_LEVELS,
  geoBoxCentre,
  geoRegionBox,
  geoRegionCentre,
  geoShapeGlyphBox,
  geoWholeCountryBox,
  geoZoomBox,
  geoZoomToFit,
  isMapZoom,
  stepMapZoom,
} from "./geoMapFraming";
import { insetFor } from "./geoMapInsets";
import { GEO_DATASETS } from "./geoRegion";
import { regionCodesInArea } from "./mapDirectory";

const JAPAN = "JP" as const;
const whole = geoWholeCountryBox(JAPAN);

describe("zooming the map", () => {
  it("draws the whole country at one", () => {
    expect(geoZoomBox(JAPAN, 1, geoBoxCentre(whole))).toEqual(whole);
  });

  it("halves each side at two, and thirds them at three", () => {
    const two = geoZoomBox(JAPAN, 2, geoBoxCentre(whole));
    expect(two.width).toBeCloseTo(whole.width / 2);
    expect(two.height).toBeCloseTo(whole.height / 2);
    expect(geoZoomBox(JAPAN, 3, geoBoxCentre(whole)).width).toBeCloseTo(whole.width / 3);
  });

  it("keeps what it was looking at in the middle", () => {
    const centre = { x: whole.width / 2, y: whole.height / 2 };
    expect(geoBoxCentre(geoZoomBox(JAPAN, 2, centre))).toEqual(centre);
  });

  /*
   * A centre near a coast would frame open sea; at 3x more than half the view
   * could be empty. Clamping the window rather than the centre means a drag
   * that runs off the edge simply stops there.
   */
  it("keeps the window on the map at every edge", () => {
    for (const centre of [
      { x: -500, y: -500 },
      { x: whole.width + 500, y: whole.height + 500 },
    ]) {
      const box = geoZoomBox(JAPAN, 3, centre);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(whole.width + 0.001);
      expect(box.y + box.height).toBeLessThanOrEqual(whole.height + 0.001);
    }
  });
});

describe("the zoom steps", () => {
  it("stops at each end rather than wrapping", () => {
    expect(stepMapZoom(1, -1)).toBe(1);
    expect(stepMapZoom(3, 1)).toBe(3);
    expect(stepMapZoom(1, 1)).toBe(2);
    expect(stepMapZoom(3, -1)).toBe(2);
  });

  it("knows its own levels", () => {
    for (const level of MAP_ZOOM_LEVELS) expect(isMapZoom(level)).toBe(true);
    expect(isMapZoom(4)).toBe(false);
    expect(isMapZoom(0)).toBe(false);
  });
});

describe("zooming to a region", () => {
  /*
   * Where it is drawn, not where it is. Okinawa is drawn in a box off the
   * south-west of the mainland, so centring on its true position took the
   * reader to open sea with the region they had just chosen off screen.
   */
  it("centres on the inset box for a region drawn in one", () => {
    const centre = geoRegionCentre(JAPAN, 47);
    expect(centre).toEqual({ x: 720 + 240 / 2, y: 860 + 230 / 2 });
  });

  it("finds the middle of one that exists", () => {
    const centre = geoRegionCentre(JAPAN, 3);
    expect(centre).not.toBeNull();
    expect(centre!.x).toBeGreaterThan(0);
  });

  /* Nothing chosen, and a code from another country's board, are both null. */
  it("has no centre for nothing, or for a code this map does not hold", () => {
    expect(geoRegionCentre(JAPAN, null)).toBeNull();
    expect(geoRegionCentre(JAPAN, "TX")).toBeNull();
  });
});

/*
 * The panel draws the chosen region on its own so its shape can be seen, and
 * it drew a whole country with the region a speck in the middle. Two reasons,
 * one test each below: the room around it was measured off its longest side
 * and added to both, and the window was near enough square while the frame it
 * was drawn in is two and a half times as wide.
 */
describe("framing one region on its own", () => {
  const FRAME = 2.5;
  const bboxOf = (code: number) =>
    GEO_DATASETS[JAPAN].regions.find((entry) => String(entry.code) === String(code))!.map.bbox;

  it("takes the shape of the frame, so nothing is added at the sides", () => {
    for (const code of [1, 13, 25, 37, 47]) {
      const box = geoRegionBox(JAPAN, code, FRAME);
      expect(box.width / box.height).toBeCloseTo(FRAME);
    }
  });

  it("fills the side that limits it, whatever shape the region is", () => {
    /* Hokkaido is wide, Shiga is tall, Tokyo is small: all fill the height. */
    for (const code of [1, 13, 25, 37]) {
      const [, minY, , maxY] = bboxOf(code);
      const box = geoRegionBox(JAPAN, code, FRAME);
      expect((maxY - minY) / box.height).toBeGreaterThan(0.8);
    }
  });

  /* 1309 by 1124 for Hokkaido, on a country 1000 by 1108. */
  it("never asks for a window larger than the country", () => {
    const whole = geoWholeCountryBox(JAPAN);
    for (const code of [1, 13, 25, 37, 47]) {
      const box = geoRegionBox(JAPAN, code, FRAME);
      expect(box.width).toBeLessThan(whole.width);
      expect(box.height).toBeLessThan(whole.height);
    }
  });

  it("keeps the region in the middle of what it frames", () => {
    const [minX, minY, maxX, maxY] = bboxOf(25);
    const centre = geoBoxCentre(geoRegionBox(JAPAN, 25, FRAME));
    expect(centre.x).toBeCloseTo((minX + maxX) / 2);
    expect(centre.y).toBeCloseTo((minY + maxY) / 2);
  });

  /*
   * Okinawa is drawn in a box off the south-west of the mainland. Framing its
   * own geometry would take the reader to open sea; framing the box it sits in
   * would leave the sea around it in shot, since it is smaller than its box.
   */
  it("frames a seated region where it is drawn, on the shape rather than the box", () => {
    const box = geoRegionBox(JAPAN, 47, FRAME);
    const inset = { x: 720, y: 860, width: 240, height: 230 };
    const centre = geoBoxCentre(box);
    expect(centre.x).toBeCloseTo(inset.x + inset.width / 2);
    expect(centre.y).toBeCloseTo(inset.y + inset.height / 2);
    expect(box.height).toBeLessThan(inset.height * 1.3);
  });

  it("falls back to the whole country for a code this map does not hold", () => {
    expect(geoRegionBox(JAPAN, "TX", FRAME)).toEqual(geoWholeCountryBox(JAPAN));
  });
});

/*
 * The directory's icons are the opposite job to the panel's frame: a square
 * every shape fills, so Kagawa is as legible in a list as Hokkaido.
 */
describe("one region's outline as an icon", () => {
  const bboxOf = (code: number) =>
    GEO_DATASETS[JAPAN].regions.find((entry) => String(entry.code) === String(code))!.map.bbox;

  it("is square, whatever shape the region is", () => {
    for (const code of [1, 13, 25, 37, 47]) {
      const box = geoShapeGlyphBox(bboxOf(code));
      expect(box.width).toBeCloseTo(box.height);
    }
  });

  it("is filled by the region's longest side, so every shape is drawn large", () => {
    for (const code of [1, 13, 25, 37, 47]) {
      const [minX, minY, maxX, maxY] = bboxOf(code);
      const box = geoShapeGlyphBox(bboxOf(code));
      expect(Math.max(maxX - minX, maxY - minY) / box.width).toBeGreaterThan(0.85);
    }
  });

  it("centres the region in it", () => {
    const [minX, minY, maxX, maxY] = bboxOf(25);
    const centre = geoBoxCentre(geoShapeGlyphBox(bboxOf(25)));
    expect(centre.x).toBeCloseTo((minX + maxX) / 2);
    expect(centre.y).toBeCloseTo((minY + maxY) / 2);
  });

  /* A region of no width at all would otherwise ask for a box of zero. */
  it("still has a size for a shape with none", () => {
    expect(geoShapeGlyphBox([10, 10, 10, 10]).width).toBeGreaterThan(0);
  });
});

/**
 * Opening a region from its heading: the reader wants Tohoku filling the view,
 * not the country with six prefectures lit somewhere in it.
 */
describe("framing a whole region", () => {
  it("shows the whole country when given nothing", () => {
    expect(geoZoomToFit(JAPAN, [])).toEqual({ zoom: 1, centre: geoBoxCentre(whole) });
  });

  it("goes in on Tohoku and keeps every prefecture inside the window", () => {
    const codes = regionCodesInArea(GEO_DATASETS.JP.regions, "Tohoku");
    const fit = geoZoomToFit(JAPAN, codes);
    expect(fit.zoom).toBeGreaterThan(1);
    const window = geoZoomBox(JAPAN, fit.zoom, fit.centre);
    for (const code of codes) {
      const [minX, minY, maxX, maxY] = GEO_DATASETS.JP.regions.find((r) => r.code === code)!.map.bbox;
      expect(minX, `${code} left`).toBeGreaterThanOrEqual(window.x - 1);
      expect(minY, `${code} top`).toBeGreaterThanOrEqual(window.y - 1);
      expect(maxX, `${code} right`).toBeLessThanOrEqual(window.x + window.width + 1);
      expect(maxY, `${code} bottom`).toBeLessThanOrEqual(window.y + window.height + 1);
    }
  });

  /* Where it is drawn, not where it is: the true position is open sea. */
  it("frames Okinawa in its inset box rather than out at sea", () => {
    const seated = insetFor(JAPAN, 47);
    expect(seated).toBeTruthy();
    const { centre } = geoZoomToFit(JAPAN, [47]);
    expect(centre.x).toBeGreaterThanOrEqual(seated!.box.x);
    expect(centre.x).toBeLessThanOrEqual(seated!.box.x + seated!.box.width);
    expect(centre.y).toBeGreaterThanOrEqual(seated!.box.y);
    expect(centre.y).toBeLessThanOrEqual(seated!.box.y + seated!.box.height);
  });

  it("stays at one for a set that will not fit closer, rather than cutting it", () => {
    const everything = GEO_DATASETS.JP.regions.map((r) => r.code);
    expect(geoZoomToFit(JAPAN, everything).zoom).toBe(1);
  });
});
