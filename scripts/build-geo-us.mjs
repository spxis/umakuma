import fs from "node:fs/promises";
import path from "node:path";

import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature, neighbors as topoNeighbors } from "topojson-client";

/**
 * Real state boundaries, from the Census Bureau by way of us-atlas.
 *
 * The previous version of this script had the shapes typed into it as literals
 * - five-point blobs standing in for states - which rendered and could not be
 * played. Everything else about Map mode was correct; the map was not a map.
 *
 * TopoJSON rather than GeoJSON because adjacency falls out of the format:
 * neighbouring features share arcs, so `neighbors` comes from topology instead
 * of a distance guess. Distractors are drawn from a state's own neighbours, so
 * getting that wrong makes every wrong answer implausible.
 *
 * Albers USA rather than a raw plot, because it is the projection that puts
 * Alaska and Hawaii in their conventional insets instead of stretching the
 * canvas across the Pacific.
 */

const SOURCE = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const OUTPUT_MAP_PATH = path.resolve("src/data/maps/us-map.json");
const OUTPUT_META_PATH = path.resolve("src/data/maps/us-meta.json");

/** The canvas Japan uses, so every board shares one coordinate space. */
const WIDTH = 1000;
const HEIGHT = 620;

/** Two decimals holds well under a pixel at this size and keeps the file small. */
const PRECISION = 2;

function round(value) {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
}

/** Trim the coordinate noise d3 emits without changing what is drawn. */
function tidyPath(d) {
  return d.replace(/-?\d+\.?\d*/g, (match) => String(round(Number(match))));
}

async function main() {
  const response = await fetch(SOURCE);
  if (!response.ok) {
    throw new Error(`Could not fetch us-atlas: ${response.status}`);
  }
  const topology = await response.json();
  const states = feature(topology, topology.objects.states);

  // Fit the projection to the canvas so the drawing fills it without distortion.
  const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], states);
  const draw = geoPath(projection);

  const adjacency = topoNeighbors(topology.objects.states.geometries);
  const existingMeta = await readExistingMeta();

  /*
   * us-atlas ships the territories too - American Samoa, Guam, the Virgin
   * Islands - and Albers USA deliberately projects none of them, returning no
   * path at all. The game models the fifty states and the District of
   * Columbia, which is what the meta file lists, so that is the filter.
   */
  const regions = states.features.flatMap((state, index) => {
    const code = postalCodeFor(state, existingMeta);
    if (!code) return [];

    const d = draw(state);
    if (!d) {
      console.warn(`Skipping ${state.properties?.name}: outside the Albers USA projection.`);
      return [];
    }

    const [[minX, minY], [maxX, maxY]] = draw.bounds(state);
    const [cx, cy] = draw.centroid(state);

    return [{
      code,
      name: state.properties?.name ?? code,
      path: tidyPath(d),
      bbox: [round(minX), round(minY), round(maxX), round(maxY)],
      centroid: [round(cx), round(cy)],
      neighbors: adjacency[index]
        .map((neighborIndex) => postalCodeFor(states.features[neighborIndex], existingMeta))
        .filter(Boolean)
        .sort(),
    }];
  });

  regions.sort((left, right) => left.code.localeCompare(right.code));

  const payload = {
    source: `${SOURCE} (US Census Bureau via us-atlas), Albers USA, fitted to ${WIDTH}x${HEIGHT}`,
    country: "US",
    countryName: "United States",
    divisionTypeName: "State",
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    width: WIDTH,
    height: HEIGHT,
    totalRegions: regions.length,
    regions,
  };

  await fs.mkdir(path.dirname(OUTPUT_MAP_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_MAP_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const averagePoints = Math.round(
    regions.reduce((total, region) => total + (region.path.match(/[MLHVCSQTAZ]/gi) ?? []).length, 0) /
      regions.length,
  );
  console.log(`Wrote ${regions.length} states to ${OUTPUT_MAP_PATH}`);
  console.log(`Average ${averagePoints} drawing commands per state.`);
  console.log(`Left ${OUTPUT_META_PATH} untouched: it holds the written facts, not the shapes.`);
}

/**
 * The two-letter code, which is what the game keys on.
 *
 * us-atlas carries FIPS ids and a name; the existing meta file already pairs
 * every state with its postal code, so it is the reliable bridge rather than a
 * table typed out again here.
 */
function postalCodeFor(state, meta) {
  const name = state?.properties?.name;
  if (!name) return "";
  const match = meta.find((entry) => entry.name === name);
  return match?.code ?? "";
}

async function readExistingMeta() {
  const raw = await fs.readFile(OUTPUT_META_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.regions ?? parsed.states ?? [];
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
