import type { CountryCode } from "./geoRegion";
import type { MapBox } from "./japanPrefectures";

/**
 * The regions a map draws in a box of their own, and where that box sits.
 *
 * A projection puts Okinawa where it really is, which on a map framed to the
 * mainland is on top of Kagoshima, and puts Alaska and Hawaii in the Pacific
 * off California - Alaska hard against the left edge, wider than Texas. Every
 * published map of these countries does the same thing about it: draw them
 * beside the mainland in a box, at a size that fits, and say so with a frame.
 *
 * The boxes are chosen against the data rather than by eye - the test checks
 * that no other region's bounds reach into them - so a box cannot quietly
 * come to rest on a prefecture again.
 */
export type GeoInset = {
  /** The region drawn in this box. */
  code: string | number;
  box: MapBox;
};

export const GEO_INSETS: Partial<Record<CountryCode, GeoInset[]>> = {
  /* South-west of the mainland is where Japanese maps put Okinawa; the space
     below Shikoku is the only part of this frame that is open sea. */
  JP: [{ code: 47, box: { x: 720, y: 860, width: 240, height: 230 } }],
  /* Stacked off the bottom-left, clear of the edge: Alaska over Hawaii, the
     order they are read in and the order they sit in on a wall map. */
  US: [
    { code: "AK", box: { x: 20, y: 455, width: 200, height: 95 } },
    { code: "HI", box: { x: 20, y: 560, width: 150, height: 52 } },
  ],
};

export function insetFor(country: CountryCode, code: string | number): GeoInset | null {
  return GEO_INSETS[country]?.find((inset) => String(inset.code) === String(code)) ?? null;
}

export type InsetTransform = { scale: number; x: number; y: number };

/**
 * What to do to a region's own geometry to seat it in its box: shrink it to
 * fit if it is too big, never magnify it, and centre it in the frame.
 */
export function insetTransform(bbox: readonly [number, number, number, number], box: MapBox): InsetTransform {
  const width = Math.max(bbox[2] - bbox[0], 0.001);
  const height = Math.max(bbox[3] - bbox[1], 0.001);
  const scale = Math.min(1, box.width / width, box.height / height);
  return {
    scale,
    x: box.x + (box.width - width * scale) / 2 - bbox[0] * scale,
    y: box.y + (box.height - height * scale) / 2 - bbox[1] * scale,
  };
}

/** The same move, applied to a point - a centroid, so a handle follows its region. */
export function applyInsetTransform(point: readonly [number, number], transform: InsetTransform): [number, number] {
  return [point[0] * transform.scale + transform.x, point[1] * transform.scale + transform.y];
}

/** The SVG the transform is written as. */
export function insetTransformAttribute(transform: InsetTransform): string {
  return `translate(${transform.x} ${transform.y}) scale(${transform.scale})`;
}
