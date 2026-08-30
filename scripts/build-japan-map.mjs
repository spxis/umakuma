/**
 * Builds the static prefecture map used by Map mode.
 *
 * Source: https://github.com/dataofjapan/land (japan.geojson), 47 features
 * carrying the official prefecture code, the Japanese name and a romaji name.
 * The raw file is ~13MB of WGS84 rings, far too much to ship, so this reduces it
 * to one SVG path per prefecture:
 *
 *   Mercator project -> drop islets below an area floor -> simplify each ring
 *   -> lay Okinawa out in an inset box -> quantise to the viewBox grid.
 *
 * Run: node scripts/build-japan-map.mjs <path-to-japan.geojson>
 * Output: src/data/japanPrefectures.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const OUTPUT_PATH = path.resolve("src/data/japanPrefectures.json");
const SOURCE_URL = "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson";

/** Okinawa is drawn in its own box, so it never stretches the mainland frame. */
const INSET_CODE = 47;
/**
 * How far from the Okinawa main island the inset reaches, in degrees.
 *
 * The prefecture runs from Yonaguni to the Daito islands, nearly 9 degrees of
 * longitude, while the main island is under one. Fitting the whole span into the
 * box leaves the island that people actually recognise about a tenth of the box
 * wide. The inset holds the main island group, which is what a Japanese map
 * shows in that corner.
 */
const INSET_FOCUS_DEGREES = 1.2;
/** Rings smaller than this are islets: real, but noise at national scale. */
const MIN_RING_AREA_KM2 = 120;
/** Douglas-Peucker tolerance, in viewBox units. */
const SIMPLIFY_TOLERANCE = 0.55;
/** Coordinate grid. Whole units keep the payload small and stay smooth at 1000px. */
const VIEWBOX_WIDTH = 1000;
const DECIMALS = 1;

const KM_PER_DEGREE = 111.32;

/**
 * Prefecture readings, which the source file does not carry. Needed so Map mode
 * can ask by reading or romaji the way the other games do.
 */
const PREFECTURE_READINGS = {
  1: "ほっかいどう", 2: "あおもり", 3: "いわて", 4: "みやぎ", 5: "あきた",
  6: "やまがた", 7: "ふくしま", 8: "いばらき", 9: "とちぎ", 10: "ぐんま",
  11: "さいたま", 12: "ちば", 13: "とうきょう", 14: "かながわ", 15: "にいがた",
  16: "とやま", 17: "いしかわ", 18: "ふくい", 19: "やまなし", 20: "ながの",
  21: "ぎふ", 22: "しずおか", 23: "あいち", 24: "みえ", 25: "しが",
  26: "きょうと", 27: "おおさか", 28: "ひょうご", 29: "なら", 30: "わかやま",
  31: "とっとり", 32: "しまね", 33: "おかやま", 34: "ひろしま", 35: "やまぐち",
  36: "とくしま", 37: "かがわ", 38: "えひめ", 39: "こうち", 40: "ふくおか",
  41: "さが", 42: "ながさき", 43: "くまもと", 44: "おおいた", 45: "みやざき",
  46: "かごしま", 47: "おきなわ",
};

/**
 * The eight regions. Map mode uses these to pick distractors that are plausible
 * without being adjacent, so a question stays hard when a prefecture has few
 * neighbours.
 */
const REGIONS = {
  Hokkaido: [1],
  Tohoku: [2, 3, 4, 5, 6, 7],
  Kanto: [8, 9, 10, 11, 12, 13, 14],
  Chubu: [15, 16, 17, 18, 19, 20, 21, 22, 23],
  Kansai: [24, 25, 26, 27, 28, 29, 30],
  Chugoku: [31, 32, 33, 34, 35],
  Shikoku: [36, 37, 38, 39],
  Kyushu: [40, 41, 42, 43, 44, 45, 46, 47],
};

/** "Kyoto Fu" -> "Kyoto"; "Hokkai Do" -> "Hokkaido", where the suffix is the name. */
function romajiName(raw) {
  const trimmed = raw.trim();
  if (trimmed.endsWith(" Do")) return trimmed.slice(0, -3).replace(/\s+/g, "") + "do";
  return trimmed.replace(/\s+(Ken|Fu|To)$/, "");
}

/** 京都府 -> 京都. 北海道 keeps its 道, which is part of the name rather than a suffix. */
function kanjiShortName(raw) {
  if (raw === "北海道") return raw;
  return raw.replace(/[県府都]$/, "");
}

function regionOf(code) {
  for (const [region, codes] of Object.entries(REGIONS)) {
    if (codes.includes(code)) return region;
  }
  throw new Error(`No region for prefecture ${code}.`);
}

/** Web Mercator. y is negated so north is up once it lands in SVG's y-down space. */
function project([lon, lat]) {
  const clamped = Math.max(-85, Math.min(85, lat));
  const radians = (clamped * Math.PI) / 180;
  return [lon, -Math.log(Math.tan(Math.PI / 4 + radians / 2)) * (180 / Math.PI)];
}

/** Rough planar area in km², enough to tell an islet from an island. */
function ringAreaKm2(ring) {
  let area = 0;
  let latSum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
    latSum += y1;
  }
  const meanLat = latSum / Math.max(1, ring.length - 1);
  const scale = KM_PER_DEGREE * KM_PER_DEGREE * Math.cos((meanLat * Math.PI) / 180);
  return Math.abs(area / 2) * scale;
}

function perpendicularDistance(point, start, end) {
  const [px, py] = point;
  const [sx, sy] = start;
  const [ex, ey] = end;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - sx, py - sy);
  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
  return Math.hypot(px - (sx + t * dx), py - (sy + t * dy));
}

/** Douglas-Peucker over an open chain. */
function simplifyChain(points, tolerance) {
  if (points.length < 3) return points;

  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxDistance <= tolerance) return [start, end];
  return [
    ...simplifyChain(points.slice(0, maxIndex + 1), tolerance).slice(0, -1),
    ...simplifyChain(points.slice(maxIndex), tolerance),
  ];
}

/**
 * Douglas-Peucker over a closed ring.
 *
 * Running the open-chain algorithm straight at a ring collapses it to nothing:
 * the first and last points are the same, so the baseline it measures against
 * has zero length and every point sits zero distance from it. The ring has to be
 * cut into two chains first, at the point furthest from the start, so each half
 * has a real baseline.
 */
function simplifyRing(ring, tolerance) {
  const open = ring.slice(0, -1);
  if (open.length < 4) return null;

  const [anchor] = open;
  let farthestIndex = 0;
  let farthestDistance = -1;
  for (let index = 1; index < open.length; index += 1) {
    const distance = Math.hypot(open[index][0] - anchor[0], open[index][1] - anchor[1]);
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestIndex = index;
    }
  }

  const first = simplifyChain(open.slice(0, farthestIndex + 1), tolerance);
  const second = simplifyChain([...open.slice(farthestIndex), anchor], tolerance);
  const merged = [...first.slice(0, -1), ...second.slice(0, -1)];
  if (merged.length < 3) return null;
  return [...merged, merged[0]];
}

function ringsOf(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) =>
    polygon.map((ring, index) => ({ ring, hole: index > 0 })),
  );
}

/**
 * Adjacency straight from the source topology: neighbouring prefectures are
 * digitised from the same boundary, so they share vertices exactly.
 */
function buildNeighbors(features) {
  const owners = new Map();
  for (const feature of features) {
    for (const { ring } of ringsOf(feature.geometry)) {
      for (const [lon, lat] of ring) {
        const key = `${lon.toFixed(6)},${lat.toFixed(6)}`;
        const set = owners.get(key) ?? new Set();
        set.add(feature.properties.id);
        owners.set(key, set);
      }
    }
  }

  const neighbors = new Map(features.map((feature) => [feature.properties.id, new Set()]));
  for (const codes of owners.values()) {
    if (codes.size < 2) continue;
    for (const code of codes) {
      for (const other of codes) {
        if (code !== other) neighbors.get(code).add(other);
      }
    }
  }
  return neighbors;
}

/**
 * Rings close enough to the largest one to belong in the inset box. `rings` is
 * already sorted largest first, so the first entry is the main island.
 */
function withinInsetFocus(rings) {
  const [main] = rings;
  const lons = main.ring.map(([lon]) => lon);
  const lats = main.ring.map(([, lat]) => lat);
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  return rings.filter((entry) =>
    entry.ring.some(
      ([lon, lat]) =>
        Math.abs(lon - centerLon) <= INSET_FOCUS_DEGREES &&
        Math.abs(lat - centerLat) <= INSET_FOCUS_DEGREES,
    ),
  );
}

function boundsOf(rings) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const { ring } of rings) {
    for (const [x, y] of ring) {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return bounds;
}

/** Area-weighted centroid of the largest ring, so the marker lands on land. */
function ringCentroid(ring) {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
  }
  if (twiceArea === 0) return ring[0];
  return [x / (3 * twiceArea), y / (3 * twiceArea)];
}

function round(value) {
  return Number(value.toFixed(DECIMALS));
}

function toPath(rings) {
  return rings
    .map(({ ring }) => {
      const [firstX, firstY] = ring[0];
      const segments = ring
        .slice(1, -1)
        .map(([x, y]) => `L${round(x)} ${round(y)}`)
        .join("");
      return `M${round(firstX)} ${round(firstY)}${segments}Z`;
    })
    .join("");
}

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    console.error(`Usage: node scripts/build-japan-map.mjs <japan.geojson>\nSource: ${SOURCE_URL}`);
    process.exit(1);
  }

  const raw = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const features = raw.features.slice().sort((left, right) => left.properties.id - right.properties.id);
  if (features.length !== 47) throw new Error(`Expected 47 prefectures, found ${features.length}.`);

  const neighbors = buildNeighbors(features);
  const sourcePointCount = features.reduce(
    (total, feature) => total + ringsOf(feature.geometry).reduce((sum, { ring }) => sum + ring.length, 0),
    0,
  );

  // Keep the rings worth drawing, still in lon/lat, then project them. The area
  // floor is applied before projection because km² is only meaningful there.
  const kept = features.map((feature) => {
    const rings = ringsOf(feature.geometry)
      .map((entry) => ({ ...entry, area: ringAreaKm2(entry.ring) }))
      .sort((left, right) => right.area - left.area);
    const surviving = rings.filter((entry) => entry.area >= MIN_RING_AREA_KM2);
    // Every prefecture keeps its largest ring, however small: Kagawa and the
    // Okinawa islands must not vanish just for being little.
    const chosen = surviving.length > 0 ? surviving : rings.slice(0, 1);
    const focused =
      feature.properties.id === INSET_CODE ? withinInsetFocus(chosen) : chosen;
    return {
      feature,
      rings: focused.map((entry) => ({ hole: entry.hole, ring: entry.ring.map(project) })),
    };
  });

  // Two frames: the mainland sets the map, Okinawa is fitted into its own box.
  const mainland = kept.filter((entry) => entry.feature.properties.id !== INSET_CODE);
  const mainlandBounds = boundsOf(mainland.flatMap((entry) => entry.rings));
  const okinawaBounds = boundsOf(
    kept.find((entry) => entry.feature.properties.id === INSET_CODE).rings,
  );

  const mainlandWidth = mainlandBounds.maxX - mainlandBounds.minX;
  const mainlandHeight = mainlandBounds.maxY - mainlandBounds.minY;
  const scale = VIEWBOX_WIDTH / mainlandWidth;
  const viewBoxHeight = round(mainlandHeight * scale);
  const toViewBox = ([x, y]) => [
    (x - mainlandBounds.minX) * scale,
    (y - mainlandBounds.minY) * scale,
  ];

  // Japan runs southwest to northeast, which leaves the lower-left corner of the
  // frame empty. That is where every Japanese map puts the Okinawa box.
  const insetWidth = VIEWBOX_WIDTH * 0.2;
  const insetHeight = VIEWBOX_WIDTH * 0.2;
  const insetX = VIEWBOX_WIDTH * 0.02;
  const insetY = viewBoxHeight - insetHeight - VIEWBOX_WIDTH * 0.02;
  // Contain rather than stretch, so the island keeps its proportions.
  const okinawaWidth = okinawaBounds.maxX - okinawaBounds.minX;
  const okinawaHeight = okinawaBounds.maxY - okinawaBounds.minY;
  const okinawaScale = Math.min(insetWidth / okinawaWidth, insetHeight / okinawaHeight);
  const okinawaOffsetX = insetX + (insetWidth - okinawaWidth * okinawaScale) / 2;
  const okinawaOffsetY = insetY + (insetHeight - okinawaHeight * okinawaScale) / 2;
  const toInset = ([x, y]) => [
    okinawaOffsetX + (x - okinawaBounds.minX) * okinawaScale,
    okinawaOffsetY + (y - okinawaBounds.minY) * okinawaScale,
  ];

  const prefectures = kept.map(({ feature, rings }) => {
    const code = feature.properties.id;
    const inInset = code === INSET_CODE;
    const placed = rings.map(({ hole, ring }) => ({
      hole,
      ring: ring.map(inInset ? toInset : toViewBox),
    }));

    const simplified = placed
      .map(({ hole, ring }) => ({ hole, ring: simplifyRing(ring, SIMPLIFY_TOLERANCE) }))
      .filter((entry) => entry.ring !== null);
    if (simplified.length === 0) throw new Error(`Prefecture ${code} simplified away entirely.`);

    const bounds = boundsOf(simplified);
    const largest = simplified
      .filter((entry) => !entry.hole)
      .reduce((best, entry) => (Math.abs(ringAreaKm2(entry.ring)) > Math.abs(ringAreaKm2(best.ring)) ? entry : best));
    const centroid = ringCentroid(largest.ring);

    return {
      code,
      kanji: kanjiShortName(feature.properties.nam_ja),
      kanjiFull: feature.properties.nam_ja,
      romaji: romajiName(feature.properties.nam),
      reading: PREFECTURE_READINGS[code],
      region: regionOf(code),
      inset: inInset,
      path: toPath(simplified),
      centroid: [round(centroid[0]), round(centroid[1])],
      bbox: [round(bounds.minX), round(bounds.minY), round(bounds.maxX), round(bounds.maxY)],
      neighbors: [...neighbors.get(code)].sort((left, right) => left - right),
    };
  });
  const keptPoints = prefectures.reduce(
    (total, entry) => total + entry.path.split("L").length + entry.path.split("M").length - 2,
    0,
  );

  const missingReading = prefectures.filter((entry) => !entry.reading);
  if (missingReading.length > 0) {
    throw new Error(`Missing readings: ${missingReading.map((entry) => entry.code).join(", ")}`);
  }

  const payload = {
    source: SOURCE_URL,
    viewBox: `0 0 ${VIEWBOX_WIDTH} ${viewBoxHeight}`,
    width: VIEWBOX_WIDTH,
    height: viewBoxHeight,
    inset: {
      code: INSET_CODE,
      x: round(insetX),
      y: round(insetY),
      width: round(insetWidth),
      height: round(insetHeight),
    },
    prefectures,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload)}\n`, "utf8");

  const bytes = (await fs.stat(OUTPUT_PATH)).size;
  const isolated = prefectures.filter((entry) => entry.neighbors.length === 0).map((entry) => entry.romaji);
  console.log(`Prefectures: ${prefectures.length}`);
  console.log(`Points: ${sourcePointCount} -> ${keptPoints}`);
  console.log(`viewBox: ${payload.viewBox}`);
  console.log(`Output: ${OUTPUT_PATH} (${(bytes / 1024).toFixed(1)}KB)`);
  console.log(`Island prefectures (no land neighbours): ${isolated.join(", ") || "none"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
