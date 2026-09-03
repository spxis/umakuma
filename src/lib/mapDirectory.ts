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
