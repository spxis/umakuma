import mapData from "@/data/maps/ca-map.json";
import metaData from "@/data/maps/ca-meta.json";

import { buildCanadaRegions } from "../geoRegionBuilders";
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
const regions = buildCanadaRegions(meta, map);

const dataset: GeoCountryDataset = {
  country: "CA",
    countryName: "Canada",
    divisionTypeName: "Province / Territory",
    divisionTypePlural: "Provinces and territories",
    viewBox: canvas.viewBox || "0 0 1000 800",
    width: canvas.width || 1000,
    height: canvas.height || 800,
    totalRegions: regions.length,
    regions: regions,
};

export default dataset;
