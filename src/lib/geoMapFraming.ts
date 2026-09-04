import { applyInsetTransform, insetFor, insetTransform } from "./geoMapInsets";
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

/**
 * The zoom step and centre that show all of these regions at once.
 *
 * For opening a region - Tohoku, the Prairies - from its heading: the reader
 * wants it filling the view, not the country with six prefectures lit
 * somewhere in it. The steps are the map's three, so this picks the closest
 * one whose window still holds everything, with the same room around it that
 * a focus box leaves; a set that will not fit at 2x is shown at 1x rather
 * than cut.
 *
 * Measured where the regions are *drawn*, like `geoRegionCentre`: Okinawa's
 * region is its inset box off the south-west, not its true position out at
 * sea, or opening it would frame water.
 *
 * The room around it is a share of *each* side, not of the longest side on
 * both - the mistake `geoRegionBox` already documents. Tohoku is 143 wide and
 * 302 tall; padding its width by 55% of its height asked for a window taller
 * than the 2x one, so every tall or wide region opened at 1x, which is to say
 * did not open.
 */
const FIT_MARGIN_RATIO = 0.15;
export function geoZoomToFit(
  country: CountryCode,
  codes: ReadonlyArray<string | number>,
): { zoom: MapZoom; centre: { x: number; y: number } } {
  const whole = geoWholeCountryBox(country);
  const drawn = GEO_DATASETS[country].regions
    .filter((region) => codes.some((code) => String(code) === String(region.code)))
    .map((region) => {
      const seated = insetFor(country, region.code);
      if (seated) return [seated.box.x, seated.box.y, seated.box.x + seated.box.width, seated.box.y + seated.box.height];
      return region.map.bbox;
    });
  if (drawn.length === 0) return { zoom: MAP_ZOOM_LEVELS[0], centre: geoBoxCentre(whole) };

  const minX = Math.min(...drawn.map((box) => box[0]));
  const minY = Math.min(...drawn.map((box) => box[1]));
  const maxX = Math.max(...drawn.map((box) => box[2]));
  const maxY = Math.max(...drawn.map((box) => box[3]));
  const centre = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  const needWidth = (maxX - minX) * (1 + FIT_MARGIN_RATIO * 2);
  const needHeight = (maxY - minY) * (1 + FIT_MARGIN_RATIO * 2);

  const zoom = [...MAP_ZOOM_LEVELS]
    .reverse()
    .find((level) => whole.width / level >= needWidth && whole.height / level >= needHeight);
  return { zoom: zoom ?? MAP_ZOOM_LEVELS[0], centre };
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
 * Two things decide it, and getting either wrong draws a country instead of a
 * shape. The room around the region is a fraction of *that side* of it, not of
 * its longest side: nine tenths of the longest side, added to both, made
 * Hokkaido's window 1309 by 1124 - larger than Japan - so the panel showed the
 * whole country with the region as a speck in it. And the window takes the
 * shape of the frame it will be drawn in, because an SVG scaled to fit keeps
 * its window's proportions and fills the rest of the frame with whatever is
 * next to it: a square window in a frame two and a half times as wide showed
 * two and a half times as much map sideways as it had asked for.
 *
 * With both right the region fills the side that limits it, and the room left
 * over falls on the other side, where it does what the room was for: the
 * neighbours show in outline, so it is a place rather than a blob. Recognising
 * Toyama means recognising the bite it takes out of the coast.
 *
 * Framed where it is *drawn*, so a region seated in an inset box is framed
 * there rather than out at sea where its own geometry sits.
 */
const SHAPE_MARGIN_RATIO = 0.1;

export function geoRegionBox(
  country: CountryCode,
  code: string | number,
  /** How much wider than tall the frame is. Square unless the caller says. */
  aspect = 1,
): MapBox {
  const region = GEO_DATASETS[country].regions.find((entry) => String(entry.code) === String(code));
  if (!region) return geoWholeCountryBox(country);

  /*
   * Where the region is drawn, which for one seated in an inset box is inside
   * that box rather than out at sea where its own geometry sits. The shape,
   * not the box it is seated in: Okinawa is smaller than the box it is given,
   * and framing the box left a tenth of the view as the sea around it.
   */
  const seated = insetFor(country, code);
  const [x0, y0, x1, y1] = region.map.bbox;
  const source = (() => {
    if (!seated) return { minX: x0, minY: y0, maxX: x1, maxY: y1 };
    const transform = insetTransform(region.map.bbox, seated.box);
    const [minX, minY] = applyInsetTransform([x0, y0], transform);
    const [maxX, maxY] = applyInsetTransform([x1, y1], transform);
    return { minX, minY, maxX, maxY };
  })();

  const spanX = Math.max(source.maxX - source.minX, 0.001);
  const spanY = Math.max(source.maxY - source.minY, 0.001);
  let width = spanX * (1 + SHAPE_MARGIN_RATIO * 2);
  let height = spanY * (1 + SHAPE_MARGIN_RATIO * 2);

  /* Grown to the frame's shape, never cropped: the region keeps its margin on
     the side that limits it and gains context on the other. */
  const shape = Math.max(aspect, 0.001);
  if (width / height < shape) width = height * shape;
  else height = width / shape;

  return {
    x: (source.minX + source.maxX) / 2 - width / 2,
    y: (source.minY + source.maxY) / 2 - height / 2,
    width,
    height,
  };
}

/**
 * A square window on one region's own outline, for drawing it as an icon.
 *
 * Square and tight, because a directory row wants a silhouette rather than a
 * map: every shape gets the same box and fills it, so Kagawa is as legible in
 * the list as Hokkaido. That is the opposite of what the panel's own frame
 * does, and deliberately - there the sizes are the point and the neighbours
 * give the region its place, while here the row's words already say which
 * place it is and the picture only has to be recognisable.
 */
const GLYPH_MARGIN_RATIO = 0.06;

export function geoShapeGlyphBox(bbox: readonly [number, number, number, number]): MapBox {
  const [minX, minY, maxX, maxY] = bbox;
  const side = Math.max(maxX - minX, maxY - minY, 0.001) * (1 + GLYPH_MARGIN_RATIO * 2);
  return { x: (minX + maxX) / 2 - side / 2, y: (minY + maxY) / 2 - side / 2, width: side, height: side };
}
