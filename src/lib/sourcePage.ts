import "server-only";

import caMeta from "@/data/maps/ca-meta.json";
import jpMeta from "@/data/maps/jp-meta.json";
import usMeta from "@/data/maps/us-meta.json";
import { GEO_DATASETS, type CountryCode } from "@/lib/geoRegion";
import { getKanjiDictionarySummary } from "@/lib/kanjiDictionary";
import { prisma } from "@/lib/prisma";
import { radicalIndexSummary } from "@/lib/radicalSearchServer";
import { getSchoolGradeIndex } from "@/lib/schoolGrades";
import { SOURCE_KEYS, type SourceKey } from "@/lib/sourceCredits";
import type { SourceReport } from "@/lib/sourceReport";
import { strokeOrderSummary } from "@/lib/strokeOrder";
import { SUBJECT_TYPES, SUBJECT_TYPE_DISPLAY } from "@/lib/domainConstants";
import { Prisma } from "@prisma/client";

/**
 * What we hold from each source, read from wherever it lives.
 *
 * Three sources are tables in Neon and stamp their own imports: the WaniKani
 * catalogue through its sync runs, the JLPT enrichment through `enrichedAt`,
 * the sentences through `ingestedAt`. Three are files on disk built by a
 * script, and say which upstream release they were built from - a KANJIDIC2
 * version, a KanjiVG commit, an export date from the curriculum tables.
 *
 * Each reader answers for its own source and nothing else, so a table that is
 * empty on one environment cannot take the page down for the others.
 */

const REPORT_COPY = {
  radicals: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].plural,
  kanji: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].plural,
  vocabulary: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].plural,
  characters: "Characters",
  charactersWithWords: "Characters with example words",
  sentences: "Sentences",
  charactersWithStrokes: "Characters with stroke order",
  classicalRadicals: "Classical radicals",
  charactersBrokenDown: "Characters broken into radicals",
  elementary: "Elementary school kanji",
  secondary: "Secondary school kanji",
  names: "Name kanji",
  regionsDrawn: "Regions drawn",
  borders: "Bordering pairs",
} as const;

async function wanikani(): Promise<SourceReport> {
  const [byType, state] = await Promise.all([
    prisma.wkSubjectCatalog.groupBy({ by: ["subjectType"], where: { hiddenAt: null }, _count: { _all: true } }),
    prisma.wkCatalogSyncState.findUnique({ where: { id: "global" } }),
  ]);
  const count = (type: string) => byType.find((row) => row.subjectType === type)?._count._all ?? 0;
  const latest = [state?.lastIncrementalSyncCompletedAt, state?.lastFullSyncCompletedAt]
    .filter((value): value is Date => value instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return {
    key: SOURCE_KEYS.wanikani,
    counts: [
      { label: REPORT_COPY.radicals, value: count(SUBJECT_TYPES.radical) },
      { label: REPORT_COPY.kanji, value: count(SUBJECT_TYPES.kanji) },
      { label: REPORT_COPY.vocabulary, value: count(SUBJECT_TYPES.vocabulary) },
    ],
    lastImportedAt: latest?.toISOString() ?? null,
    version: null,
    generatedAtMs: Date.now(),
  };
}

async function kanjiapi(): Promise<SourceReport> {
  const [total, withWords, latest] = await Promise.all([
    prisma.jlptKanji.count(),
    prisma.jlptKanji.count({ where: { NOT: { wordExamples: { equals: Prisma.DbNull } } } }),
    prisma.jlptKanji.aggregate({ _max: { enrichedAt: true } }),
  ]);
  return {
    key: SOURCE_KEYS.kanjiapi,
    counts: [
      { label: REPORT_COPY.characters, value: total },
      { label: REPORT_COPY.charactersWithWords, value: withWords },
    ],
    lastImportedAt: latest._max.enrichedAt?.toISOString() ?? null,
    version: null,
    generatedAtMs: Date.now(),
  };
}

/** A table that is not there yet reads as nothing held, not as a broken page. */
function isMissingTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

async function tatoeba(): Promise<SourceReport> {
  try {
    const [total, latest] = await Promise.all([
      prisma.tatoebaSentence.count(),
      prisma.tatoebaSentence.aggregate({ _max: { ingestedAt: true } }),
    ]);
    return {
      key: SOURCE_KEYS.tatoeba,
      counts: [{ label: REPORT_COPY.sentences, value: total }],
      lastImportedAt: latest._max.ingestedAt?.toISOString() ?? null,
      version: null,
      generatedAtMs: Date.now(),
    };
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return { key: SOURCE_KEYS.tatoeba, counts: [{ label: REPORT_COPY.sentences, value: 0 }], lastImportedAt: null, version: null, generatedAtMs: Date.now() };
  }
}

function kanjidic2(): SourceReport {
  const summary = getKanjiDictionarySummary();
  return {
    key: SOURCE_KEYS.kanjidic2,
    counts: [{ label: REPORT_COPY.characters, value: summary?.totalCount ?? 0 }],
    lastImportedAt: summary?.attribution.dateOfCreation ?? null,
    version: summary?.attribution.databaseVersion ?? null,
    generatedAtMs: Date.now(),
  };
}

function kanjivg(): SourceReport {
  const summary = strokeOrderSummary();
  return {
    key: SOURCE_KEYS.kanjivg,
    counts: [{ label: REPORT_COPY.charactersWithStrokes, value: summary?.characterCount ?? 0 }],
    lastImportedAt: null,
    version: summary ? summary.commit.slice(0, 12) : null,
    generatedAtMs: Date.now(),
  };
}

function radkfile(): SourceReport {
  const summary = radicalIndexSummary();
  return {
    key: SOURCE_KEYS.radkfile,
    counts: [
      { label: REPORT_COPY.classicalRadicals, value: summary.radicalCount },
      { label: REPORT_COPY.charactersBrokenDown, value: summary.kanjiCount },
    ],
    lastImportedAt: null,
    version: null,
    generatedAtMs: Date.now(),
  };
}

function curriculum(): SourceReport {
  const index = getSchoolGradeIndex();
  return {
    key: SOURCE_KEYS.curriculum,
    counts: [
      { label: REPORT_COPY.elementary, value: index?.elementaryKanjiCount ?? 0 },
      { label: REPORT_COPY.secondary, value: index?.secondaryKanjiCount ?? 0 },
      { label: REPORT_COPY.names, value: index?.nameKanjiCount ?? 0 },
    ],
    lastImportedAt: index?.exportedAt ?? index?.updatedAt ?? null,
    version: null,
    generatedAtMs: Date.now(),
  };
}

/*
 * A map's build date, off the meta file the generator stamps. The geometry
 * files carry a source line and no date; the meta files carry the date. Both
 * are written by the same `pnpm map:build:all` run, so either one dates it.
 */
const MAP_BUILD_DATES: Record<CountryCode, string> = {
  JP: jpMeta.updatedAt,
  US: usMeta.updatedAt,
  CA: caMeta.updatedAt,
};

/**
 * What a country's board holds: how many regions, and how many borders between
 * them.
 *
 * The border count is the honest measure of the second thing we take. The
 * outlines are the visible borrowing, but the adjacency - which state touches
 * which - is what makes a wrong answer plausible, and it comes from the same
 * file. A pair is counted once, not twice.
 */
function geoMap(key: SourceKey, country: CountryCode): SourceReport {
  const dataset = GEO_DATASETS[country];
  const pairs = new Set(
    dataset.regions.flatMap((region) =>
      region.map.neighbors.map((neighbor) => [String(region.code), String(neighbor)].sort().join("~")),
    ),
  );

  return {
    key,
    counts: [
      { label: REPORT_COPY.regionsDrawn, value: dataset.totalRegions },
      { label: REPORT_COPY.borders, value: pairs.size },
    ],
    lastImportedAt: MAP_BUILD_DATES[country] ?? null,
    version: null,
    generatedAtMs: Date.now(),
  };
}

export async function loadSourceReport(key: SourceKey): Promise<SourceReport> {
  switch (key) {
    case SOURCE_KEYS.wanikani:
      return wanikani();
    case SOURCE_KEYS.kanjiapi:
      return kanjiapi();
    case SOURCE_KEYS.tatoeba:
      return tatoeba();
    case SOURCE_KEYS.kanjidic2:
      return kanjidic2();
    case SOURCE_KEYS.kanjivg:
      return kanjivg();
    case SOURCE_KEYS.radkfile:
      return radkfile();
    case SOURCE_KEYS.curriculum:
      return curriculum();
    case SOURCE_KEYS.jpmap:
      return geoMap(key, "JP");
    case SOURCE_KEYS.usmap:
      return geoMap(key, "US");
    case SOURCE_KEYS.camap:
      return geoMap(key, "CA");
  }
}
