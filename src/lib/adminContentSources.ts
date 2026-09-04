import "server-only";

import caMap from "@/data/maps/ca-map.json";
import thMap from "@/data/maps/th-map.json";
import cnMap from "@/data/maps/cn-map.json";
import auMap from "@/data/maps/au-map.json";
import twMap from "@/data/maps/tw-map.json";
import jpMap from "@/data/maps/jp-map.json";
import usMap from "@/data/maps/us-map.json";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import { GEO_REGION_COUNTS } from "./geoSubjectIds";
import { prisma } from "./prisma";
import { getSchoolGradeIndex } from "./schoolGrades";

/**
 * The state of the content that is not WaniKani and not JLPT.
 *
 * School grades and the map datasets both start life as files in the repo and
 * reach the app by different routes: grades are seeded into `SchoolGradeKanji`
 * by a script, maps are read straight off disk. Neither had anywhere in the
 * admin to see whether that had actually happened.
 *
 * That gap has already cost a production incident once in this repo, in the
 * schema rather than the content: `map` was added to an enum, deployed green,
 * and every Map run failed in production because the push had only ever
 * reached the local database. Content drifts the same way and just as
 * silently - a grade file gains twenty kanji, nobody re-runs the seed, and the
 * explorer quietly shows the old list.
 *
 * So both panels answer one question: does what shipped match what is loaded?
 */

export type GradeSourceRow = {
  grade: number;
  label: string;
  /** What the repo's grade file claims. */
  inFiles: number;
  /** What the database actually holds. */
  inDatabase: number;
};

export type GradeSourceReport = {
  updatedAt: string | null;
  standard: string | null;
  totalInFiles: number;
  totalInDatabase: number;
  rows: GradeSourceRow[];
  /** Grades where the file and the database disagree. */
  drifted: number[];
};

export type MapSourceRow = {
  country: CountryCode;
  countryName: string;
  divisionTypeName: string;
  regions: number;
  expectedRegions: number;
  source: string;
  viewBox: string;
  /** Mean drawing commands per region - the crude measure of real geometry. */
  averagePathCommands: number;
  /** Regions with no neighbours, which cannot supply plausible distractors. */
  orphans: string[];
};

export type AdminContentSources = {
  grades: GradeSourceReport;
  maps: MapSourceRow[];
};

/**
 * Where each map came from, read off the generated file.
 *
 * `GeoCountryDataset` does not carry the source line - the app has no use for
 * it - but provenance is most of what an admin panel about generated data is
 * for. A map with no recorded source is one nobody can regenerate.
 */
const MAP_SOURCES: Record<CountryCode, string> = {
  JP: jpMap.source,
  US: usMap.source,
  CA: caMap.source,
  TH: thMap.source,
  CN: cnMap.source,
  AU: auMap.source,
  TW: twMap.source,
};

function countPathCommands(path: string): number {
  return (path.match(/[MLHVCSQTAZ]/gi) ?? []).length;
}

async function buildGradeReport(): Promise<GradeSourceReport> {
  const index = getSchoolGradeIndex();

  const dbRows = await prisma.schoolGradeKanji.groupBy({
    by: ["grade"],
    _count: { _all: true },
  });
  const dbByGrade = new Map(dbRows.map((row) => [row.grade, row._count._all]));

  const rows: GradeSourceRow[] = (index?.grades ?? []).map((entry) => ({
    grade: entry.grade,
    label: entry.name,
    inFiles: entry.totalCount ?? 0,
    inDatabase: dbByGrade.get(entry.grade) ?? 0,
  }));

  return {
    updatedAt: index?.updatedAt ?? null,
    standard: index?.standard ?? null,
    totalInFiles: index?.totalKanjiCount ?? rows.reduce((sum, row) => sum + row.inFiles, 0),
    totalInDatabase: [...dbByGrade.values()].reduce((sum, count) => sum + count, 0),
    rows,
    drifted: rows.filter((row) => row.inFiles !== row.inDatabase).map((row) => row.grade),
  };
}

function buildMapRows(): MapSourceRow[] {
  return (Object.keys(GEO_DATASETS) as CountryCode[]).map((country) => {
    const dataset = GEO_DATASETS[country];
    const commands = dataset.regions.reduce(
      (sum, region) => sum + countPathCommands(region.map.path),
      0,
    );

    return {
      country,
      countryName: dataset.countryName,
      divisionTypeName: dataset.divisionTypeName,
      regions: dataset.regions.length,
      expectedRegions: GEO_REGION_COUNTS[country],
      source: MAP_SOURCES[country],
      viewBox: dataset.viewBox,
      averagePathCommands: dataset.regions.length
        ? Math.round(commands / dataset.regions.length)
        : 0,
      orphans: dataset.regions
        .filter((region) => region.map.neighbors.length === 0)
        .map((region) => String(region.code)),
    };
  });
}

export async function fetchAdminContentSources(): Promise<AdminContentSources> {
  return {
    grades: await buildGradeReport(),
    maps: buildMapRows(),
  };
}
