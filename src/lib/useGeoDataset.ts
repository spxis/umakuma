"use client";

import { useEffect, useReducer } from "react";

import { geoDatasetIfLoaded } from "./geoDatasetRegistry";
import { loadGeoDataset } from "./geoDatasetLoaders";
import type { CountryCode, GeoCountryDataset } from "./geoRegionTypes";

/**
 * One country's data, fetched when a surface actually needs it.
 *
 * Returns null until the chunk lands, so a caller has to say what an unloaded
 * map looks like rather than crashing on `undefined.regions`. The registry is
 * module-level, so coming back to a country already seen is synchronous and
 * this never returns null twice for the same one.
 *
 * Deliberately not seeded from the server. Handing the dataset down as a prop
 * would put Canada's megabyte in the RSC payload of every navigation, where it
 * cannot be cached; a chunk is fetched once and then belongs to the browser.
 * The cost is a skeleton on first paint, which is the right trade for a page
 * whose whole job is to draw one country at a time.
 */
export function useGeoDataset(country: CountryCode): GeoCountryDataset | null {
  const [, arrived] = useReducer((n: number) => n + 1, 0);
  const dataset = geoDatasetIfLoaded(country) ?? null;

  useEffect(() => {
    if (geoDatasetIfLoaded(country)) return undefined;
    let live = true;
    void loadGeoDataset(country).then(() => {
      if (live) arrived();
    });
    return () => {
      live = false;
    };
  }, [country]);

  return dataset;
}
