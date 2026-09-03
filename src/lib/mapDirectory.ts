import type { GeoRegion } from "./geoRegion";

/**
 * The regions of a country, in the areas it is actually read in.
 *
 * A Japanese map is learned as eight areas, not as a run of 47 names, and an
 * American one as regions rather than fifty alphabetical states - so a
 * directory that lists them flat is asking somebody to hold the whole country
 * in their head at once. Every dataset already carries the area each region
 * belongs to; this only groups by it.
 *
 * Order is the caller's, twice over: the areas come out in the order their
 * first region appears, and each area keeps the order it was given. So the
 * numbered Japanese order runs north to south down the list, and an
 * alphabetical country stays alphabetical inside each area.
 */
export type RegionArea = { name: string; regions: GeoRegion[] };

export function groupRegionsByArea(regions: GeoRegion[]): RegionArea[] {
  const areas: RegionArea[] = [];
  const byName = new Map<string, RegionArea>();
  for (const region of regions) {
    /* A region with no area of its own is its own heading rather than a gap. */
    const name = region.region?.trim() || region.name;
    const held = byName.get(name);
    if (held) {
      held.regions.push(region);
      continue;
    }
    const area = { name, regions: [region] };
    byName.set(name, area);
    areas.push(area);
  }
  return areas;
}

/**
 * Every region code in one named area.
 *
 * The directory groups by area for reading; the map needs the same grouping to
 * paint. Both go through this rather than each walking the list its own way,
 * so an area heading and the shapes it lights can never disagree about which
 * prefectures are in Tohoku.
 *
 * An unknown name is an empty list rather than an error: the area a member was
 * pointing at can go away under them when the country changes.
 */
export function regionCodesInArea(
  regions: GeoRegion[],
  areaName: string | null,
): (string | number)[] {
  if (!areaName) return [];
  return regions
    .filter((region) => (region.region?.trim() || region.name) === areaName)
    .map((region) => region.code);
}
