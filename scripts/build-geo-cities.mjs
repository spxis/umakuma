import fs from "node:fs/promises";
import path from "node:path";

import { geoAlbersUsa, geoContains, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

import { COUNTRY_CONFIGS, loadDataset, projectionFor, withRegionCodes } from "./build-geo-countries.mjs";

/*
 * Natural Earth's Populated Places, projected onto each country's own canvas.
 *
 * A city is a point and a division is a polygon; they land together only if
 * both went through the same projection. Every country here therefore reuses
 * the projection its own map was drawn with, and there are three of those:
 *
 *   Natural Earth (30 countries) - `projectionFor` refits the country builder's
 *     own configuration. Nothing is restated; the builder is imported.
 *
 *   United States - `geoAlbersUsa().fitSize([1000, 620], states)`, rebuilt from
 *     us-atlas exactly as `build-geo-us.mjs` does. No migration was needed and
 *     Alaska and Hawaii need no special case: Albers USA carries them in their
 *     conventional insets, so it puts Anchorage and Honolulu in the boxes the
 *     map already draws.
 *
 *   Japan - the one map with no projection in code. `build-geo-jp-map.mjs` only
 *     reshapes an existing file of curated Mercator paths, so the transform is
 *     recovered by least squares from the mainland prefecture centroids, and
 *     then checked: every city must land inside its own prefecture or this
 *     throws. Okinawa is drawn in a box at the foot of the map, and its cities
 *     are moved into that box the same way its outline was.
 *
 * 10m rather than the 110m file: 110m holds 243 cities for the whole world.
 */
const CACHED_PLACES = "/tmp/ne_10m_populated_places.json";
const PLACES_SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson";
const CACHED_US = "/tmp/us-atlas-states-10m.json";
const US_SOURCE = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const PRECISION = 2;
const round = (value) => {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
};

/*
 * Natural Earth files a few abandoned settlements under Populated Places and
 * marks them as what they are - Ennadai in Nunavut, whose people were relocated
 * in the 1950s, is Canada's. A layer switched on by pressing "Cities" should
 * not draw a place that has not been one for seventy years.
 */
const NOT_A_CITY = new Set(["Historic place"]);

/**
 * Which division a point falls in, asked of the geometry.
 *
 * Names were the first attempt and they are not up to it: Natural Earth calls
 * a French city's ADM1NAME one thing and the department it sits in another, so
 * all 58 French cities came back without a region, and Italy and Spain were
 * nearly as bad. A point either is inside a polygon or it is not, in every
 * language at once - so ask that, and keep the name only as a fallback for the
 * handful that sit just offshore of their own coastline.
 */
function regionContaining(features, coords) {
  for (const f of features) {
    if (geoContains(f, coords)) return f.properties.__code ?? f.properties.__usCode ?? null;
  }
  return null;
}

/* "Québec" on a city against "Quebec" on the division, "Ōita Prefecture"
   against "Oita". Compare without diacritics or the division word. */
const plain = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+(prefecture|province|state|region|county|oblast)$/i, "")
    .trim()
    .toLowerCase();

async function cachedJson(file, url, label) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    console.log(`Fetching ${label}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${label} fetch failed: ${response.status}`);
    const data = await response.json();
    await fs.writeFile(file, JSON.stringify(data), "utf8");
    return data;
  }
}

function capitalKind(props) {
  const cla = String(props.FEATURECLA ?? "");
  if (cla === "Admin-0 capital" || props.ADM0CAP === 1) return "country";
  if (cla === "Admin-1 capital") return "region";
  return null;
}

function cityRecord(props, point, region) {
  return {
    name: props.NAME_EN || props.NAME || props.NAMEASCII,
    region,
    x: round(point[0]),
    y: round(point[1]),
    rank: Number(props.SCALERANK ?? 10),
    capital: capitalKind(props),
    population: Number(props.POP_MAX ?? 0),
  };
}

/** One country's places, already filtered of the ones that are not cities. */
function placesOf(places, { iso2, iso3, countryName }) {
  return places.filter((f) => {
    const p = f.properties;
    const mine = p.ISO_A2 === iso2 || (iso3 && p.ADM0_A3 === iso3) || plain(p.ADM0NAME) === plain(countryName);
    return mine && !NOT_A_CITY.has(String(p.FEATURECLA));
  });
}

/**
 * Turn projected points into the file the app reads.
 *
 * Anything outside the canvas is dropped rather than clamped: a city pinned to
 * the frame edge reads as fact and is not one.
 */
function assemble({ code, countryName, width, height, sourceLine, cities }) {
  const kept = cities.filter((city) => city.x >= 0 && city.y >= 0 && city.x <= width && city.y <= height);
  kept.sort((a, b) => a.rank - b.rank || b.population - a.population || a.name.localeCompare(b.name));
  return {
    payload: {
      source: sourceLine,
      updatedAt: new Date().toISOString(),
      country: code,
      countryName,
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      totalCities: kept.length,
      cities: kept,
    },
    dropped: cities.length - kept.length,
  };
}

async function write(code, payload, note) {
  const dir = path.resolve("src/data/maps");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${code.toLowerCase()}-cities.json`);
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[${code}] ${String(payload.totalCities).padStart(4)} cities${note}`);
}

/* --------------------------------------------------------------- Natural Earth */

async function buildNaturalEarth(config, divisions, places) {
  const featuresWithCodes = withRegionCodes(config, divisions);
  const proj = projectionFor(config, featuresWithCodes);

  const codeByName = new Map();
  for (const f of featuresWithCodes) {
    for (const label of [f.properties.name_en, f.properties.name, f.properties.name_local, f.properties.gn_name]) {
      if (label) codeByName.set(plain(label), f.properties.__code);
    }
  }

  const cities = [];
  for (const f of placesOf(places, { iso2: config.code, countryName: config.countryName })) {
    const coords = f.geometry?.coordinates ?? [];
    const point = proj(coords);
    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
    const region = regionContaining(featuresWithCodes, coords) ?? codeByName.get(plain(f.properties.ADM1NAME)) ?? null;
    cities.push(cityRecord(f.properties, point, region));
  }

  const { payload, dropped } = assemble({
    code: config.code,
    countryName: config.countryName,
    width: config.width,
    height: config.height,
    sourceLine: `${PLACES_SOURCE} (Natural Earth populated places), fitted to ${config.width}x${config.height}`,
    cities,
  });
  const orphans = payload.cities.filter((city) => !city.region).length;
  await write(config.code, payload, `${dropped ? ` (${dropped} off-canvas)` : ""}${orphans ? ` (${orphans} unmatched region)` : ""}`);
}

/* ------------------------------------------------------------------ United States */

async function buildUnitedStates(places) {
  const topo = await cachedJson(CACHED_US, US_SOURCE, "us-atlas states");
  const states = feature(topo, topo.objects.states);
  const WIDTH = 1000;
  const HEIGHT = 620;
  const proj = geoAlbersUsa().fitSize([WIDTH, HEIGHT], states);

  const usMap = JSON.parse(await fs.readFile(path.resolve("src/data/maps/us-map.json"), "utf8"));
  const codeByName = new Map(usMap.regions.map((region) => [plain(region.name), region.code]));
  /* The state polygons carry a name, not a postal code; tag each with the code
     the map uses so containment can answer in the map's own vocabulary. */
  const tagged = states.features.map((f) => ({
    ...f,
    properties: { ...f.properties, __code: codeByName.get(plain(f.properties.name)) ?? null },
  }));

  const cities = [];
  let unplaceable = 0;
  for (const f of placesOf(places, { iso2: "US", iso3: "USA", countryName: "United States of America" })) {
    /* Albers USA returns null outside the fifty states and DC: Puerto Rico and
       the Pacific territories land here, and the map does not draw them. */
    const coords = f.geometry?.coordinates ?? [];
    const point = proj(coords);
    if (!point) {
      unplaceable++;
      continue;
    }
    const region = regionContaining(tagged, coords) ?? codeByName.get(plain(f.properties.ADM1NAME)) ?? null;
    cities.push(cityRecord(f.properties, point, region));
  }

  const { payload, dropped } = assemble({
    code: "US",
    countryName: "United States",
    width: WIDTH,
    height: HEIGHT,
    sourceLine: `${PLACES_SOURCE} (Natural Earth populated places), Albers USA, fitted to ${WIDTH}x${HEIGHT}`,
    cities,
  });
  await write(
    "US",
    payload,
    `${dropped ? ` (${dropped} off-canvas)` : ""}${unplaceable ? ` (${unplaceable} outside Albers USA)` : ""}`,
  );
}

/* ------------------------------------------------------------------------- Japan */

/**
 * Recover Japan's transform, and refuse to guess.
 *
 * The prefecture outlines are curated Mercator paths with no projection in
 * code, so the mapping from longitude and latitude onto that canvas is solved
 * for: one uniform scale and a translation, fitted by least squares to the
 * mainland prefecture centroids. Tokyo, Kagoshima and Okinawa are held out
 * because their far-flung islands drag a centroid away from the drawn shape.
 *
 * A fit is only worth having if it can be checked, so the caller checks it:
 * every city must land inside its own prefecture or the build throws rather
 * than shipping a map with Sendai in the sea.
 */
function fitJapan(admin1, jpMap) {
  const byCode = new Map();
  const codeByName = new Map();
  for (const f of admin1) {
    const m = /^JP-(\d+)$/.exec(f.properties.iso_3166_2 ?? "");
    if (!m) continue;
    const code = String(Number(m[1]));
    byCode.set(code, f);
    for (const label of [f.properties.name_en, f.properties.name, f.properties.gn_name]) {
      if (label) codeByName.set(plain(label), code);
    }
  }

  const canvas = new Map(jpMap.regions.map((r) => [String(r.code), r.centroid]));
  const raw = geoMercator().scale(1).translate([0, 0]);
  const rawPath = geoPath(raw);

  const HELD_OUT = new Set(["13", "46", "47"]);
  const pts = [...byCode.keys()]
    .filter((code) => !HELD_OUT.has(code) && canvas.has(code))
    .map((code) => ({ p: rawPath.centroid(byCode.get(code)), q: canvas.get(code) }));

  const n = pts.length;
  const avg = (pick) => pts.reduce((a, r) => a + pick(r), 0) / n;
  const mpx = avg((r) => r.p[0]);
  const mpy = avg((r) => r.p[1]);
  const mqx = avg((r) => r.q[0]);
  const mqy = avg((r) => r.q[1]);
  let num = 0;
  let den = 0;
  for (const { p, q } of pts) {
    num += (p[0] - mpx) * (q[0] - mqx) + (p[1] - mpy) * (q[1] - mqy);
    den += (p[0] - mpx) ** 2 + (p[1] - mpy) ** 2;
  }
  const scale = num / den;
  const tx = mqx - scale * mpx;
  const ty = mqy - scale * mpy;
  const project = ([lon, lat]) => {
    const p = raw([lon, lat]);
    if (!p) return null;
    return [scale * p[0] + tx, scale * p[1] + ty];
  };

  /*
   * Okinawa's outline is stored already moved into the box at the foot of the
   * map, the way Japanese maps draw it. Its cities have to make the same move,
   * measured from where the projection puts the prefecture against where the
   * map actually keeps it.
   */
  let okinawa = null;
  const stored = jpMap.regions.find((r) => String(r.code) === "47")?.bbox;
  if (stored && byCode.has("47")) {
    const bounds = rawPath.bounds(byCode.get("47"));
    const p0 = [scale * bounds[0][0] + tx, scale * bounds[0][1] + ty];
    const p1 = [scale * bounds[1][0] + tx, scale * bounds[1][1] + ty];
    const w = p1[0] - p0[0] || 1;
    const h = p1[1] - p0[1] || 1;
    const s = Math.min((stored[2] - stored[0]) / w, (stored[3] - stored[1]) / h);
    okinawa = { s, x0: p0[0], y0: p0[1], boxX0: stored[0], boxY0: stored[1] };
  }

  const place = (coords, regionCode) => {
    const point = project(coords);
    if (!point) return null;
    if (regionCode === "47" && okinawa) {
      return [okinawa.boxX0 + (point[0] - okinawa.x0) * okinawa.s, okinawa.boxY0 + (point[1] - okinawa.y0) * okinawa.s];
    }
    return point;
  };

  const tagged = [...byCode.entries()].map(([code, f]) => ({
    ...f,
    properties: { ...f.properties, __code: code },
  }));

  return { codeByName, place, fitted: n, tagged };
}

async function buildJapan(admin1, places) {
  const jpMap = JSON.parse(await fs.readFile(path.resolve("src/data/maps/jp-map.json"), "utf8"));
  const { codeByName, place, fitted, tagged } = fitJapan(admin1, jpMap);
  const boxes = new Map(jpMap.regions.map((r) => [String(r.code), r.bbox]));

  const cities = [];
  const strays = [];
  for (const f of placesOf(places, { iso2: "JP", iso3: "JPN", countryName: "Japan" })) {
    const coords = f.geometry?.coordinates ?? [];
    const region = regionContaining(tagged, coords) ?? codeByName.get(plain(f.properties.ADM1NAME)) ?? null;
    const point = place(coords, region);
    if (!point) continue;
    const box = region ? boxes.get(region) : null;
    if (box) {
      const [x0, y0, x1, y1] = box;
      const inside = point[0] >= x0 - 8 && point[0] <= x1 + 8 && point[1] >= y0 - 8 && point[1] <= y1 + 8;
      if (!inside) strays.push(`${f.properties.NAME} (${f.properties.ADM1NAME})`);
    }
    cities.push(cityRecord(f.properties, point, region));
  }

  if (strays.length > 0) {
    throw new Error(
      `Japan's recovered projection puts ${strays.length} cities outside their prefecture: ${strays.slice(0, 6).join(", ")}. ` +
        "Refusing to write a map that would draw them in the wrong place.",
    );
  }

  const { payload, dropped } = assemble({
    code: "JP",
    countryName: "Japan",
    width: jpMap.width,
    height: jpMap.height,
    sourceLine: `${PLACES_SOURCE} (Natural Earth populated places), fitted to the curated Mercator canvas ${jpMap.width}x${jpMap.height}`,
    cities,
  });
  await write("JP", payload, ` (transform fitted on ${fitted} prefectures${dropped ? `, ${dropped} off-canvas` : ""})`);
}

/* -------------------------------------------------------------------------- main */

async function main() {
  const divisions = await loadDataset();
  const placesData = await cachedJson(CACHED_PLACES, PLACES_SOURCE, "populated places");
  const places = placesData.features;

  for (const config of COUNTRY_CONFIGS) {
    await buildNaturalEarth(config, divisions.features, places);
  }
  await buildUnitedStates(places);
  await buildJapan(divisions.features, places);

  console.log(`Cities built for ${COUNTRY_CONFIGS.length + 2} countries.`);
}

main().catch((err) => {
  console.error("City build failed:", err.message);
  process.exitCode = 1;
});
