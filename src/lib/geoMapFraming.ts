import { insetFor } from "./geoMapInsets";
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

/**
 * How far in the map is drawn, as steps rather than a free zoom.
 *
 * Three steps because the reason for zooming is a specific one: the Kanto
 * prefectures and the New England states are drawn a few pixels across on a
 * whole-country map, and no amount of squinting separates Saitama from Gunma.
 * A free zoom would offer a hundred framings of which two are useful; these
 * are the two, plus the whole country to come back to.
 */
export const MAP_ZOOM_LEVELS = [1, 2, 3] as const;

export type MapZoom = (typeof MAP_ZOOM_LEVELS)[number];

export function isMapZoom(value: number): value is MapZoom {
  return (MAP_ZOOM_LEVELS as readonly number[]).includes(value);
}

/** One step in or out, clamped: the ends stay put rather than wrapping. */
export function stepMapZoom(zoom: MapZoom, by: 1 | -1): MapZoom {
  const at = MAP_ZOOM_LEVELS.indexOf(zoom);
  return MAP_ZOOM_LEVELS[Math.min(MAP_ZOOM_LEVELS.length - 1, Math.max(0, at + by))]!;
}

/**
 * The window a zoom level and a centre make.
 *
 * Kept on the map: a centre near a coast would otherwise frame open sea, and
 * at 3x more than half the view could be empty. Clamping the window rather
 * than the centre means a drag that runs off the edge simply stops there,
 * which is what a reader expects from every other map they have used.
 */
export function geoZoomBox(
  country: CountryCode,
  zoom: MapZoom,
  centre: { x: number; y: number },
): MapBox {
  const whole = geoWholeCountryBox(country);
  if (zoom <= 1) return whole;

  const width = whole.width / zoom;
  const height = whole.height / zoom;
  return {
    x: Math.min(Math.max(centre.x - width / 2, 0), whole.width - width),
    y: Math.min(Math.max(centre.y - height / 2, 0), whole.height - height),
    width,
    height,
  };
}

/** Where a box is looking, which is what a zoom step keeps hold of. */
export function geoBoxCentre(box: MapBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * The middle of a region, for zooming to whatever somebody just chose.
 *
 * Where it is *drawn*, not where it is. Okinawa is drawn in a box off the
 * south-west of the mainland and Alaska in one below the lower forty-eight,
 * so centring on their true positions took the reader to open sea with the
 * region they had just chosen nowhere on screen.
 */
export function geoRegionCentre(
  country: CountryCode,
  code: string | number | null,
): { x: number; y: number } | null {
  if (code === null) return null;
  const seated = insetFor(country, code);
  if (seated) return geoBoxCentre(seated.box);

  const region = GEO_DATASETS[country].regions.find((entry) => String(entry.code) === String(code));
  if (!region) return null;
  const [minX, minY, maxX, maxY] = region.map.bbox;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/**
 * A window tight on one region, for drawing it on its own.
 *
 * Wider than the region by a little, so the neighbours show as outline: a
 * shape with nothing around it is a blob, and recognising Toyama means
 * recognising the bite it takes out of the coast. Where it is *drawn*, so a
 * region that lives in an inset box is framed there.
 */
const SHAPE_PADDING_RATIO = 0.9;

export function geoRegionBox(country: CountryCode, code: string | number): MapBox {
  const seated = insetFor(country, code);
  const source = seated
    ? { minX: seated.box.x, minY: seated.box.y, maxX: seated.box.x + seated.box.width, maxY: seated.box.y + seated.box.height }
    : (() => {
        const region = GEO_DATASETS[country].regions.find((entry) => String(entry.code) === String(code));
        if (!region) return null;
        const [minX, minY, maxX, maxY] = region.map.bbox;
        return { minX, minY, maxX, maxY };
      })();
  if (!source) return geoWholeCountryBox(country);

  const span = Math.max(source.maxX - source.minX, source.maxY - source.minY);
  const padding = span * SHAPE_PADDING_RATIO;
  const width = source.maxX - source.minX + padding * 2;
  const height = source.maxY - source.minY + padding * 2;
  return {
    x: (source.minX + source.maxX) / 2 - width / 2,
    y: (source.minY + source.maxY) / 2 - height / 2,
    width,
    height,
  };
}
