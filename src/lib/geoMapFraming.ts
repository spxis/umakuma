import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import type { MapBox } from "./japanPrefectures";

/**
 * Framing a map, for any country.
 *
 * The Japan versions of these read `JAPAN_MAP` directly, which is fine while
 * Japan is the only board and wrong the moment it is not: a round of American
 * states drew every question over the Japanese coastline, because the question
 * knew its country and the map did not.
 *
 * The ratios are the ones the Japanese board already used, kept so its framing
 * is unchanged.
 */

const FOCUS_PADDING_RATIO = 0.55;
const MIN_FOCUS_SPAN_RATIO = 0.22;

export function geoWholeCountryBox(country: CountryCode): MapBox {
  const dataset = GEO_DATASETS[country];
  return { x: 0, y: 0, width: dataset.width, height: dataset.height };
}

/** The window that frames these regions, or the whole country when none are given. */
export function geoFocusBox(country: CountryCode, codes: ReadonlyArray<string | number>): MapBox {
  const dataset = GEO_DATASETS[country];
  const whole = geoWholeCountryBox(country);

  const framed = dataset.regions.filter((region) =>
    codes.some((code) => String(code) === String(region.code)),
  );
  if (framed.length === 0) return whole;

  const minX = Math.min(...framed.map((entry) => entry.map.bbox[0]));
  const minY = Math.min(...framed.map((entry) => entry.map.bbox[1]));
  const maxX = Math.max(...framed.map((entry) => entry.map.bbox[2]));
  const maxY = Math.max(...framed.map((entry) => entry.map.bbox[3]));

  const padding = Math.max(maxX - minX, maxY - minY) * FOCUS_PADDING_RATIO;
  const minimumSpan = dataset.width * MIN_FOCUS_SPAN_RATIO;
  const width = Math.max(maxX - minX + padding * 2, minimumSpan);
  const height = Math.max(maxY - minY + padding * 2, minimumSpan);
  if (width >= dataset.width && height >= dataset.height) return whole;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  // Keep the window on the map, so a coastal region does not frame open sea.
  return {
    x: Math.min(Math.max(centerX - width / 2, 0), Math.max(0, dataset.width - width)),
    y: Math.min(Math.max(centerY - height / 2, 0), Math.max(0, dataset.height - height)),
    width,
    height,
  };
}

/** True when the box shows the whole country rather than a zoomed-in window. */
export function geoBoxIsWholeCountry(country: CountryCode, box: MapBox): boolean {
  const dataset = GEO_DATASETS[country];
  return box.width >= dataset.width && box.height >= dataset.height;
}
