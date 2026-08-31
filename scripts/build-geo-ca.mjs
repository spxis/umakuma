import fs from "node:fs/promises";
import path from "node:path";

import { geoConicConformal, geoPath } from "d3-geo";

/**
 * Real province and territory boundaries, from Natural Earth admin-1.
 *
 * This script used to carry the shapes as literals - Ontario was five points -
 * which rendered and could not be played: you cannot recognise a province from
 * a pentagon. Everything else about Map mode was already correct.
 *
 * Natural Earth rather than us-atlas's equivalent because Canada has no
 * comparable single-purpose TopoJSON on a CDN, and admin-1 covers every country
 * at once. It is GeoJSON, so adjacency does not come free the way it does from
 * topology; neighbours are computed from shared boundary points instead, which
 * is exact for surveyed borders that share vertices.
 *
 * Lambert conformal conic at Canada's standard parallels, because that is the
 * projection Canadian maps use. A raw plot puts Nunavut across half the canvas
 * and squashes the populated south into a strip.
 */

const SOURCE =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson";
const OUTPUT_MAP_PATH = path.resolve("src/data/maps/ca-map.json");
const OUTPUT_META_PATH = path.resolve("src/data/maps/ca-meta.json");

const WIDTH = 1000;
const HEIGHT = 720;
const PRECISION = 2;

function round(value) {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
}

function tidyPath(d) {
  return d.replace(/-?\d+\.?\d*/g, (match) => String(round(Number(match))));
}

/** Every coordinate in a feature, however deeply the rings are nested. */
function coordinatesOf(geometry) {
  const out = [];
  const walk = (node) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      out.push(node);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(geometry?.coordinates);
  return out;
}

/**
 * Neighbours by shared boundary points.
 *
 * Natural Earth draws adjacent provinces from the same vertices, so two that
 * touch share coordinates exactly. Rounding to four decimals absorbs float
 * noise while staying far finer than any real border gap.
 */
function neighboursBySharedPoints(features) {
  const keysFor = features.map(
    (f) => new Set(coordinatesOf(f.geometry).map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`)),
  );

  return features.map((_, index) =>
    features
      .map((other, otherIndex) => {
        if (otherIndex === index) return null;
        for (const key of keysFor[otherIndex]) {
          if (keysFor[index].has(key)) return other.properties.__code;
        }
        return null;
      })
      .filter(Boolean)
      .sort(),
  );
}

async function main() {
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`Could not fetch Natural Earth admin-1: ${response.status}`);
  const collection = await response.json();

  const meta = await readExistingMeta();
  const byName = new Map(meta.map((entry) => [entry.name.toLowerCase(), entry.code]));

  const features = collection.features
    .filter((f) => f.properties?.iso_a2 === "CA" || f.properties?.admin === "Canada")
    .map((f) => {
      /*
       * Natural Earth carries the two-letter postal code, which is what the
       * game keys on. Matching by name instead fails on Québec, where the
       * source is accented and the meta file is not - the kind of near-miss
       * that silently drops a province rather than erroring.
       */
      const name = f.properties?.name_en ?? f.properties?.name ?? "";
      const code = f.properties?.postal ?? byName.get(name.toLowerCase()) ?? "";
      return { ...f, properties: { ...f.properties, __code: code } };
    })
    .filter((f) => f.properties.__code);

  if (features.length !== meta.length) {
    const found = new Set(features.map((f) => f.properties.__code));
    const missing = meta.filter((entry) => !found.has(entry.code)).map((entry) => entry.name);
    throw new Error(`Matched ${features.length} of ${meta.length}. Missing: ${missing.join(", ")}`);
  }

  const projection = geoConicConformal()
    .parallels([49, 77])
    .rotate([96, 0])
    .fitSize([WIDTH, HEIGHT], { type: "FeatureCollection", features });
  const draw = geoPath(projection);

  const adjacency = neighboursBySharedPoints(features);

  const regions = features.map((f, index) => {
    const d = draw(f);
    if (!d) throw new Error(`No path produced for ${f.properties.name}`);
    const [[minX, minY], [maxX, maxY]] = draw.bounds(f);
    const [cx, cy] = draw.centroid(f);

    return {
      code: f.properties.__code,
      name: f.properties.name_en ?? f.properties.name,
      path: tidyPath(d),
      bbox: [round(minX), round(minY), round(maxX), round(maxY)],
      centroid: [round(cx), round(cy)],
      neighbors: adjacency[index],
    };
  });

  regions.sort((left, right) => left.code.localeCompare(right.code));

  const payload = {
    source: `${SOURCE} (Natural Earth admin-1), Lambert conformal conic, fitted to ${WIDTH}x${HEIGHT}`,
    country: "CA",
    countryName: "Canada",
    divisionTypeName: "Province / territory",
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    width: WIDTH,
    height: HEIGHT,
    totalRegions: regions.length,
    regions,
  };

  await fs.mkdir(path.dirname(OUTPUT_MAP_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_MAP_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const averagePoints = Math.round(
    regions.reduce((total, r) => total + (r.path.match(/[MLHVCSQTAZ]/gi) ?? []).length, 0) / regions.length,
  );
  const orphans = regions.filter((r) => r.neighbors.length === 0).map((r) => r.code);
  console.log(`Wrote ${regions.length} provinces and territories to ${OUTPUT_MAP_PATH}`);
  console.log(`Average ${averagePoints} drawing commands each.`);
  console.log(`Without neighbours: ${orphans.length > 0 ? orphans.join(", ") : "none"}`);
}

async function readExistingMeta() {
  const raw = await fs.readFile(OUTPUT_META_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.regions ?? parsed.provinces ?? [];
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
