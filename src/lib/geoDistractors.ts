import { GEO_DATASETS, type CountryCode, type GeoRegion } from "./geoRegion";

/**
 * What makes one map region a convincing wrong answer for another.
 *
 * Somewhere on the far side of the country is never tempting, so the choices are
 * drawn from the target's own corner of the map: land neighbours first, then its
 * region, then whatever is nearest. It also keeps the Find board legible, since
 * the tiles are places on one map and clustered candidates stay readable.
 *
 * The rule is the same wherever the map is, so it lives here rather than inside
 * the Japan question builder that first needed it.
 */
export const GEO_DISTRACTOR_SCORES = {
  neighbor: 100,
  region: 60,
  proximity: 40,
} as const;

/** The parts of a region this scoring reads, so callers can pass their own shape. */
export type GeoScorable = {
  code: string | number;
  region: string;
  centroid: [number, number];
  neighbors: ReadonlyArray<string | number>;
};

export function geoDistractorScore(target: GeoScorable, candidate: GeoScorable, mapDiagonal: number): number {
  let score = 0;

  // Codes are numeric for prefectures and two letters elsewhere, so compare as
  // text rather than trusting both sides to be the same primitive.
  if (target.neighbors.some((neighbor) => String(neighbor) === String(candidate.code))) {
    score += GEO_DISTRACTOR_SCORES.neighbor;
  }

  if (target.region === candidate.region) {
    score += GEO_DISTRACTOR_SCORES.region;
  }

  const distance = Math.hypot(
    target.centroid[0] - candidate.centroid[0],
    target.centroid[1] - candidate.centroid[1],
  );
  const closeness = mapDiagonal > 0 ? Math.max(0, 1 - distance / mapDiagonal) : 0;
  return score + Math.round(GEO_DISTRACTOR_SCORES.proximity * closeness);
}

/** A dataset region in the shape the scoring reads. */
export function geoRegionToScorable(region: GeoRegion): GeoScorable {
  return {
    code: region.code,
    region: region.region,
    centroid: region.map.centroid,
    neighbors: region.map.neighbors,
  };
}

/**
 * The corner-to-corner length of a country's map, which proximity is measured
 * against. Each country is drawn in its own viewBox, so a distance only means
 * something relative to that country's own canvas.
 */
export function geoMapDiagonal(country: CountryCode): number {
  const dataset = GEO_DATASETS[country];
  return Math.hypot(dataset.width, dataset.height);
}
