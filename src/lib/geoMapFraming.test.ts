import { describe, expect, it } from "vitest";

import {
  MAP_ZOOM_LEVELS,
  geoBoxCentre,
  geoRegionCentre,
  geoWholeCountryBox,
  geoZoomBox,
  isMapZoom,
  stepMapZoom,
} from "./geoMapFraming";

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
