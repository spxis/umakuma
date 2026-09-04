import fs from "node:fs/promises";
import path from "node:path";

import { COUNTRY_CONFIGS, loadDataset, projectionFor, withRegionCodes } from "./build-geo-countries.mjs";

/*
 * Natural Earth's Populated Places, projected onto a country's own map canvas.
 *
 * The boundaries are polygons and a city is a single point, but they are the
 * same dataset family in the same coordinate system, so a city lands in the
 * right place only if it goes through the *same* projection - the one
 * `projectionFor` fits to that country's divisions. Nothing here chooses a
 * projection of its own; that is the whole reason this script imports the
 * country builder rather than restating it.
 *
 * 10m rather than the 110m file: 110m holds 243 cities for the whole world and
 * three of them are in Canada. 10m holds 255 in Canada alone, and its own
 * `scalerank` reproduces the sparser sets exactly - rank <= 4 is the same 45
 * cities the 50m file contains - so one ingest covers every density the map
 * wants to draw.
 */
const CACHED_SOURCE = "/tmp/ne_10m_populated_places.json";
const REMOTE_SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson";

/** Countries whose map carries a city layer. A pilot: Canada only. */
const CITY_COUNTRIES = ["CA"];

/*
 * Natural Earth files a few abandoned settlements under Populated Places and
 * marks them as what they are. Ennadai in Nunavut is the one in Canada: the
 * people who lived there were relocated in the 1950s and its population in the
 * dataset is zero. A layer the reader turned on by pressing "Cities" should
 * not draw a place that has not been one in seventy years, and the dataset
 * already says which those are.
 */
const NOT_A_CITY = new Set(["Historic place"]);

const PRECISION = 2;
const round = (value) => {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
};

/* "Québec" in the city rows, "Quebec" on the division. Compare without either. */
const plain = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

async function loadPlaces() {
  try {
    const cached = await fs.readFile(CACHED_SOURCE, "utf8");
    console.log("Using cached populated places");
    return JSON.parse(cached);
  } catch {
    console.log(`Fetching ${REMOTE_SOURCE}`);
    const response = await fetch(REMOTE_SOURCE);
    if (!response.ok) throw new Error(`Populated places fetch failed: ${response.status}`);
    const data = await response.json();
    await fs.writeFile(CACHED_SOURCE, JSON.stringify(data), "utf8");
    return data;
  }
}

/**
 * Which capital a place is, if any.
 *
 * Natural Earth says this in words on `FEATURECLA`. Kept as a word here too
 * rather than two booleans: a place is the country's capital, a division's
 * capital, or neither, and never two of those at once.
 */
function capitalKind(props) {
  const cla = String(props.FEATURECLA ?? "");
  if (cla === "Admin-0 capital" || props.ADM0CAP === 1) return "country";
  if (cla === "Admin-1 capital") return "region";
  return null;
}

async function buildCities(config, divisions, places) {
  const featuresWithCodes = withRegionCodes(config, divisions);
  const proj = projectionFor(config, featuresWithCodes);

  /* Division name -> the code the map builder gave it, so a city knows its region. */
  const codeByName = new Map();
  for (const feature of featuresWithCodes) {
    const props = feature.properties;
    for (const label of [props.name_en, props.name, props.name_local, props.gn_name]) {
      if (label) codeByName.set(plain(label), props.__code);
    }
  }

  const mine = places.filter(
    (f) =>
      (f.properties.ADM0_A3 === "CAN" ||
        f.properties.ISO_A2 === config.code ||
        f.properties.ADM0NAME === config.countryName) &&
      !NOT_A_CITY.has(String(f.properties.FEATURECLA)),
  );

  const cities = [];
  const unplaced = [];
  for (const feature of mine) {
    const props = feature.properties;
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const point = proj([coords[0], coords[1]]);
    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
      unplaced.push(props.NAME);
      continue;
    }
    /*
     * Outside the canvas means the projection put it off the drawn map - a
     * cropped island, usually. Dropped rather than clamped: a city pinned to
     * the frame edge is worse than a city absent, because it reads as fact.
     */
    if (point[0] < 0 || point[1] < 0 || point[0] > config.width || point[1] > config.height) {
      unplaced.push(props.NAME);
      continue;
    }

    const region = codeByName.get(plain(props.ADM1NAME)) ?? null;
    cities.push({
      name: props.NAME_EN || props.NAME || props.NAMEASCII,
      region,
      x: round(point[0]),
      y: round(point[1]),
      rank: Number(props.SCALERANK ?? 10),
      capital: capitalKind(props),
      population: Number(props.POP_MAX ?? 0),
    });
  }

  cities.sort((a, b) => a.rank - b.rank || b.population - a.population || a.name.localeCompare(b.name));

  const payload = {
    source: `${REMOTE_SOURCE} (Natural Earth populated places), fitted to ${config.width}x${config.height}`,
    updatedAt: new Date().toISOString(),
    country: config.code,
    countryName: config.countryName,
    viewBox: `0 0 ${config.width} ${config.height}`,
    width: config.width,
    height: config.height,
    totalCities: cities.length,
    cities,
  };

  const file = path.resolve("src/data/maps", `${config.code.toLowerCase()}-cities.json`);
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const noRegion = cities.filter((city) => !city.region).length;
  console.log(
    `[${config.code}] ${cities.length} cities -> ${file}` +
      (unplaced.length ? ` (${unplaced.length} off-canvas: ${unplaced.slice(0, 5).join(", ")})` : "") +
      (noRegion ? ` (${noRegion} without a region)` : ""),
  );
}

async function main() {
  const divisions = await loadDataset();
  const places = await loadPlaces();

  for (const code of CITY_COUNTRIES) {
    const config = COUNTRY_CONFIGS.find((entry) => entry.code === code);
    if (!config) throw new Error(`No country config for ${code}`);
    await buildCities(config, divisions.features, places.features);
  }
}

main().catch((err) => {
  console.error("City build failed:", err);
  process.exitCode = 1;
});
