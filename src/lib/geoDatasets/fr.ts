import mapData from "@/data/maps/fr-map.json";
import metaData from "@/data/maps/fr-meta.json";

import { buildStandardRegions } from "../geoRegionBuilders";
import type { GeoCountryDataset } from "../geoRegionTypes";

/*
 * One country, one module, one chunk. Generated from Natural Earth boundaries:
 * the outlines, the names and the neighbours are true, and nothing else about
 * these regions is claimed - see `isCuratedMapCountry`.
 */
const meta = metaData as unknown as Record<string, unknown>;
const map = mapData as unknown as Record<string, unknown>;
const canvas = mapData as unknown as { viewBox?: string; width?: number; height?: number };
const regions = buildStandardRegions("FR", meta, map, "province");

const dataset: GeoCountryDataset = {
  country: "FR",
  countryName: "France",
  divisionTypeName: "Department",
  divisionTypePlural: "Departments",
  viewBox: canvas.viewBox || "0 0 1000 1000",
  width: canvas.width || 1000,
  height: canvas.height || 1000,
  totalRegions: regions.length,
  regions,
};

export default dataset;
