import { describe, expect, it } from "vitest";

import { GEO_DATASETS } from "./geoRegion";
import { geoSubjectId } from "./geoSubjectIds";
import {
  MAP_HANDLE_CLEARANCE,
  MAP_HANDLE_SLOTS,
  orderGeoOptionsByPosition,
  placeMapHandles,
} from "./mapHandles";

const RADIUS = 10;

function place(points: ReadonlyArray<readonly [number, number]>) {
  return placeMapHandles(
    points.map((centroid, index) => ({ item: index, centroid })),
    RADIUS,
  );
}

/** The smallest gap between any two handles, in radii. */
function tightestGap(spots: ReturnType<typeof place>): number {
  let tightest = Infinity;
  for (let i = 0; i < spots.length; i += 1) {
    for (let j = i + 1; j < spots.length; j += 1) {
      const gap = Math.hypot(spots[i]!.hx - spots[j]!.hx, spots[i]!.hy - spots[j]!.hy) / RADIUS;
      tightest = Math.min(tightest, gap);
    }
  }
  return tightest;
}

describe("handle clearance", () => {
  /*
   * Two circles of radius r touch at 2r. The rule this replaced allowed 1.9,
   * so every pair it declared clear was already a tenth of a handle into its
   * neighbour - the overlap that showed up even when the fallback worked.
   */
  it("asks for more than two radii, which is where circles touch", () => {
    expect(MAP_HANDLE_CLEARANCE).toBeGreaterThan(2);
  });

  it("keeps handles apart when regions sit on top of each other", () => {
    // Four centroids within a single handle's width - the Maritimes case.
    const spots = place([
      [100, 100],
      [104, 103],
      [98, 106],
      [102, 97],
    ]);
    expect(spots).toHaveLength(4);
    expect(tightestGap(spots)).toBeGreaterThanOrEqual(MAP_HANDLE_CLEARANCE);
  });

  /*
   * The old placement had exactly two positions, so a third crowded region
   * found both taken and went back on top of the first. Any board of four has
   * to come out with four handles you can tell apart.
   */
  it("finds room for a third and fourth, not just a second", () => {
    const spots = place([[0, 0], [0, 0], [0, 0], [0, 0]]);
    expect(tightestGap(spots)).toBeGreaterThanOrEqual(MAP_HANDLE_CLEARANCE);
  });

  it("leaves a lone handle directly above its region", () => {
    const [only] = place([[50, 50]]);
    expect(only!.hx).toBe(50);
    expect(only!.hy).toBeLessThan(50);
  });

  /*
   * The two properties have to agree. Handles are numbered west to east so
   * they read as a row, and only a sideways nudge can push one past the
   * neighbour it was meant to follow - so every vertical escape is spent
   * before the first sideways one is considered.
   */
  it("exhausts the vertical positions before moving a handle sideways", () => {
    const firstSideways = MAP_HANDLE_SLOTS.findIndex(([dx]) => dx !== 0);
    expect(firstSideways).toBeGreaterThanOrEqual(4);
    for (const [dx] of MAP_HANDLE_SLOTS.slice(0, firstSideways)) expect(dx).toBe(0);
  });

  it("keeps a crowded column numbered left to right", () => {
    // Four regions in a vertical line: every handle should stay in its column.
    const spots = place([[100, 100], [100, 104], [100, 108], [100, 112]]);
    expect(spots.every((spot) => spot.hx === 100)).toBe(true);
    expect(tightestGap(spots)).toBeGreaterThanOrEqual(MAP_HANDLE_CLEARANCE);
  });

  it("keeps handles inside the frame when it can", () => {
    // A region hard against the top edge: above would crop, below fits.
    const spots = placeMapHandles(
      [{ item: "edge", centroid: [100, 5] as const }],
      RADIUS,
      { x: 0, y: 0, width: 200, height: 200 },
    );
    expect(spots[0]!.hy).toBeGreaterThan(5);
    expect(spots[0]!.hy - RADIUS).toBeGreaterThanOrEqual(0);
  });
});

describe("numbering the handles", () => {
  const japan = GEO_DATASETS.JP.regions;
  const optionFor = (code: string | number) => ({ subjectId: geoSubjectId("JP", code)! });

  /*
   * The complaint this fixes: handles were numbered by the shuffle, so a round
   * read 3 2 4 1 across the map. West to east, whatever order they arrive in.
   */
  it("orders the choices west to east", () => {
    const byX = [...japan].sort((a, b) => a.map.centroid[0] - b.map.centroid[0]);
    const west = byX[0]!;
    const east = byX[byX.length - 1]!;
    const middle = byX[Math.floor(byX.length / 2)]!;

    // Handed to it in the wrong order on purpose.
    const ordered = orderGeoOptionsByPosition([
      optionFor(east.code),
      optionFor(west.code),
      optionFor(middle.code),
    ]);

    const xs = ordered.map((option) => {
      const region = japan.find((r) => geoSubjectId("JP", r.code) === option.subjectId)!;
      return region.map.centroid[0];
    });
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("keeps every choice it was given", () => {
    const options = japan.slice(0, 4).map((region) => optionFor(region.code));
    const ordered = orderGeoOptionsByPosition(options);
    expect(ordered).toHaveLength(4);
    expect(new Set(ordered.map((o) => o.subjectId))).toEqual(new Set(options.map((o) => o.subjectId)));
  });

  /*
   * A subject id that names no region must not vanish from the board - a
   * dropped choice is a question that cannot be answered correctly.
   */
  it("keeps a choice that resolves to no region, at the end", () => {
    const real = optionFor(japan[0]!.code);
    const stray = { subjectId: 1 };
    const ordered = orderGeoOptionsByPosition([stray, real]);
    expect(ordered).toHaveLength(2);
    expect(ordered[1]).toBe(stray);
  });

  it("does not disturb the array it was given", () => {
    const options = [optionFor(japan[10]!.code), optionFor(japan[0]!.code)];
    const before = options.map((o) => o.subjectId);
    orderGeoOptionsByPosition(options);
    expect(options.map((o) => o.subjectId)).toEqual(before);
  });
});
