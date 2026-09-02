import { describe, expect, it } from "vitest";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import { GEO_INSETS, applyInsetTransform, insetFor, insetTransform } from "./geoMapInsets";

describe("where a map puts the regions it draws in a box", () => {
  /* The bug: Okinawa's box sat on Kagoshima, so the two read as one place. */
  it("puts every box where no other region reaches", () => {
    for (const [country, insets] of Object.entries(GEO_INSETS) as [CountryCode, typeof GEO_INSETS[CountryCode]][]) {
      const inBoxes = new Set((insets ?? []).map((inset) => String(inset.code)));
      for (const inset of insets ?? []) {
        const trespassers = GEO_DATASETS[country].regions.filter((region) => {
          if (inBoxes.has(String(region.code))) return false;
          const [x0, y0, x1, y1] = region.map.bbox;
          return x0 < inset.box.x + inset.box.width && x1 > inset.box.x && y0 < inset.box.y + inset.box.height && y1 > inset.box.y;
        });
        expect(trespassers.map((region) => region.code), `${country} ${inset.code}`).toEqual([]);
      }
    }
  });

  it("keeps every box inside the frame the map is drawn in", () => {
    for (const [country, insets] of Object.entries(GEO_INSETS) as [CountryCode, typeof GEO_INSETS[CountryCode]][]) {
      const dataset = GEO_DATASETS[country];
      for (const inset of insets ?? []) {
        expect(inset.box.x).toBeGreaterThanOrEqual(0);
        expect(inset.box.y).toBeGreaterThanOrEqual(0);
        expect(inset.box.x + inset.box.width).toBeLessThanOrEqual(dataset.width);
        expect(inset.box.y + inset.box.height).toBeLessThanOrEqual(dataset.height);
      }
    }
  });

  it("names the regions each country draws apart, and nothing else", () => {
    expect(insetFor("JP", 47)?.box.x).toBe(720);
    expect(insetFor("JP", 13)).toBeNull();
    expect(insetFor("US", "AK")).not.toBeNull();
    expect(insetFor("US", "HI")).not.toBeNull();
    expect(insetFor("CA", "YT")).toBeNull();
  });
});

describe("seating a region in its box", () => {
  const box = { x: 100, y: 200, width: 50, height: 50 };

  it("shrinks what is too big and centres it", () => {
    const transform = insetTransform([0, 0, 100, 100], box);
    expect(transform.scale).toBe(0.5);
    expect(applyInsetTransform([0, 0], transform)).toEqual([100, 200]);
    expect(applyInsetTransform([100, 100], transform)).toEqual([150, 250]);
  });

  /* A small region should sit in the middle of its frame, not be blown up to fill it. */
  it("never magnifies", () => {
    const transform = insetTransform([0, 0, 10, 10], box);
    expect(transform.scale).toBe(1);
    expect(applyInsetTransform([5, 5], transform)).toEqual([125, 225]);
  });
});
