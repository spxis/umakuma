import mapData from "@/data/maps/th-map.json";
import metaData from "@/data/maps/th-meta.json";

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
const regions = buildStandardRegions("TH", meta, map, "province");

const dataset: GeoCountryDataset = {
  country: "TH",
    countryName: "Thailand",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    viewBox: canvas.viewBox || "0 0 1000 1400",
    width: canvas.width || 1000,
    height: canvas.height || 1400,
    totalRegions: regions.length,
    regions: regions,
};

export default dataset;
