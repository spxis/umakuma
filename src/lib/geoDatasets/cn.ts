import mapData from "@/data/maps/cn-map.json";
import metaData from "@/data/maps/cn-meta.json";

import { buildStandardRegions } from "../geoRegionBuilders";
import type { GeoCountryDataset } from "../geoRegionTypes";

/*
 * One country, one module, one chunk.
 *
 * Imported statically only by `geoRegionServer.ts`, where the bundle never
 * reaches a browser, and dynamically everywhere else - so a reader looking at
 * Japan does not download Canada.
 */
const meta = metaData as unknown as Record<string, unknown>;
const map = mapData as unknown as Record<string, unknown>;
/* The canvas fields, typed: the builders want a loose record, this wants three values. */
const canvas = mapData as unknown as { viewBox?: string; width?: number; height?: number };
const regions = buildStandardRegions("CN", meta, map, "province");

const dataset: GeoCountryDataset = {
  country: "CN",
    countryName: "China",
    divisionTypeName: "Province / Municipality",
    divisionTypePlural: "Provinces and municipalities",
    viewBox: canvas.viewBox || "0 0 1000 750",
    width: canvas.width || 1000,
    height: canvas.height || 750,
    totalRegions: regions.length,
    regions: regions,
};

export default dataset;
