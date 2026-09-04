import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { GEO_DATASET_COUNTRIES } from "./geoDatasetLoaders";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(process.cwd(), dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(process.cwd(), rel)).isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(rel);
  }
  return out;
}

/*
 * A browser downloads one country, not seven.
 *
 * `geoRegion.ts` used to import fourteen JSON files at the top and build every
 * dataset eagerly, so any client component touching it pulled 3.5 MB - of
 * which Canada is a megabyte alone and the four admin-only countries are 1.6
 * MB that a public visitor can never open. The splitting is one careless
 * import away from being undone, and nobody would notice until the next time
 * somebody measured. So it is asserted here rather than remembered.
 */
describe("map data stays split by country", () => {
  const clientFiles = walk("src/app").filter((path) => read(path).startsWith('"use client"'));

  it("finds the client components, so this test is actually looking at something", () => {
    expect(clientFiles.length).toBeGreaterThan(20);
  });

  it("has no client component importing every country at once", () => {
    const guilty = clientFiles.filter((path) => {
      const source = read(path);
      return source.includes("geoDatasetsAll") || source.includes("geoRegionServer");
    });
    expect(guilty).toEqual([]);
  });

  it("has no client component importing a country's data file directly", () => {
    const guilty = clientFiles.filter((path) => /@\/data\/maps\/[a-z]{2}-(map|meta)\.json/.test(read(path)));
    expect(guilty).toEqual([]);
  });

  it("keeps geoRegion.ts free of map data, so importing it costs nothing", () => {
    const source = read("src/lib/geoRegion.ts");
    expect(source).not.toMatch(/@\/data\/maps\//);
  });

  it("gives every country its own dynamic import, which is what makes a chunk", () => {
    const loaders = read("src/lib/geoDatasetLoaders.ts");
    for (const country of GEO_DATASET_COUNTRIES) {
      expect(loaders).toContain(`import("./geoDatasets/${country.toLowerCase()}")`);
    }
  });

  it("has a dataset module per country, each importing only its own files", () => {
    for (const country of GEO_DATASET_COUNTRIES) {
      const code = country.toLowerCase();
      const source = read(`src/lib/geoDatasets/${code}.ts`);
      const imported = [...source.matchAll(/@\/data\/maps\/([a-z]{2})-/g)].map((m) => m[1]);
      expect(new Set(imported)).toEqual(new Set([code]));
    }
  });
});
