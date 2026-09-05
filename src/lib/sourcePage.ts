import "server-only";

/* Every country in memory. The browser loads one at a time; the server, which
   ships no bundle, wants the lot - see geoRegionServer. */
import "./geoRegionServer";

import caMeta from "@/data/maps/ca-meta.json";
import jpMeta from "@/data/maps/jp-meta.json";
import usMeta from "@/data/maps/us-meta.json";
import thMeta from "@/data/maps/th-meta.json";
import cnMeta from "@/data/maps/cn-meta.json";
import auMeta from "@/data/maps/au-meta.json";
import twMeta from "@/data/maps/tw-meta.json";
import { GEO_DATASETS, type CountryCode } from "@/lib/geoRegion";
import { getKanjiDictionarySummary } from "@/lib/kanjiDictionary";
import { prisma } from "@/lib/prisma";
import { radicalIndexSummary } from "@/lib/radicalSearchServer";
import { getSchoolGradeIndex } from "@/lib/schoolGrades";
import { totalCitiesPlaced } from "@/lib/geoCities";
import {
  NATURAL_EARTH_TOTAL_BORDERS,
  NATURAL_EARTH_TOTAL_COUNTRIES,
  NATURAL_EARTH_TOTAL_REGIONS,
} from "@/lib/naturalEarthCountries";
import { SOURCE_KEYS, type SourceKey } from "@/lib/sourceCredits";
import { CONFUSABLE_SOURCES, confusableCounts } from "@/lib/kanjiConfusables";
import { cachedSourceReport } from "@/lib/sourceReportCache";
import { wordFrequencySummary } from "@/lib/wordFrequency";
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
  countriesMapped: "Countries mapped",
  citiesPlaced: "Cities placed",
  wordsWithBand: "Words with a frequency band",
  wordsRanked: "Words ranked",
  confusablePairs: "Look-alike pairs",
  charactersPaired: "Characters with a look-alike",
  mediaCorpora: "Media corpora",
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

/*
 * The pairs file is a union of three sources and this reports our half of it:
 * the measured distances. WaniKani's own pairings are counted under WaniKani,
 * where a reader looking for them would go.
 */
function kanjiConfusion(): SourceReport {
  const counts = confusableCounts();
  return {
    key: SOURCE_KEYS.kanjiConfusion,
    counts: [
      { label: REPORT_COPY.confusablePairs, value: counts.bySource[CONFUSABLE_SOURCES.strokeEditDistance] },
      { label: REPORT_COPY.charactersPaired, value: counts.characters },
    ],
    lastImportedAt: null,
    version: null,
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

/*
 * Two sources over one file. `pnpm build:word-frequency` reads both and writes
 * a single summary, so each reader answers for its own half of it: JMdict for
 * the newspaper band, Jiten for everything spoken. Reporting them as one source
 * would credit the wrong holder on half the data.
 */
function jmdict(): SourceReport {
  const summary = wordFrequencySummary();
  return {
    key: SOURCE_KEYS.jmdict,
    counts: [{ label: REPORT_COPY.wordsWithBand, value: summary?.coverage.newspaper ?? 0 }],
    lastImportedAt: summary?.generatedAt ?? null,
    version: summary?.versions.jmdict ?? null,
    generatedAtMs: Date.now(),
  };
}

function jiten(): SourceReport {
  const summary = wordFrequencySummary();
  /* Newspaper is JMdict's; the rest of the corpora are Jiten's. */
  const media = (summary?.corpora ?? []).filter((corpus) => corpus !== "newspaper");
  return {
    key: SOURCE_KEYS.jiten,
    counts: [
      { label: REPORT_COPY.mediaCorpora, value: media.length },
      { label: REPORT_COPY.wordsRanked, value: summary?.coverage.global ?? 0 },
    ],
    lastImportedAt: summary?.generatedAt ?? null,
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
const MAP_BUILD_DATES: Partial<Record<CountryCode, string>> = {
  JP: jpMeta.updatedAt,
  US: usMeta.updatedAt,
  CA: caMeta.updatedAt,
  TH: thMeta.updatedAt,
  CN: cnMeta.updatedAt,
  AU: auMeta.updatedAt,
  TW: twMeta.updatedAt,
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

/**
 * What Natural Earth provides: regions drawn, countries mapped, and bordering
 * pairs across Canada and all world regional datasets.
 *
 * Counted from the country manifest rather than typed in. The three figures
 * were literals - 1244, 30, 2591 - on the one page whose whole job is to say
 * truthfully what we hold from whom, and the sums that produce them were
 * already exported and going unused.
 *
 * The date is the newest of the datasets this build actually loads, not
 * Canada's alone. Canada's config sets `skipMetaWrite`, so its meta keeps the
 * date of the first pull; reading only that file had the page reporting Aug 30
 * for a set of maps brought in on Sep 4.
 */
function naturalEarth(key: SourceKey): SourceReport {
  const imported = [caMeta.updatedAt, thMeta.updatedAt, cnMeta.updatedAt, auMeta.updatedAt, twMeta.updatedAt]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort();

  return {
    key,
    counts: [
      { label: REPORT_COPY.regionsDrawn, value: NATURAL_EARTH_TOTAL_REGIONS },
      { label: REPORT_COPY.countriesMapped, value: NATURAL_EARTH_TOTAL_COUNTRIES },
      { label: REPORT_COPY.borders, value: NATURAL_EARTH_TOTAL_BORDERS },
      /*
       * The city layer is Populated Places, the same provider's other dataset.
       * Counted across every map that draws one - which now includes Japan and
       * the United States, whose outlines are somebody else's but whose city
       * points are Natural Earth's.
       */
      { label: REPORT_COPY.citiesPlaced, value: totalCitiesPlaced() },
    ],
    lastImportedAt: imported.at(-1) ?? null,
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
    case SOURCE_KEYS.kanjiConfusion:
      return kanjiConfusion();
    case SOURCE_KEYS.jmdict:
      return jmdict();
    case SOURCE_KEYS.jiten:
      return jiten();
    case SOURCE_KEYS.curriculum:
      return curriculum();
    case SOURCE_KEYS.jpmap:
      return geoMap(key, "JP");
    case SOURCE_KEYS.usmap:
      return geoMap(key, "US");
    case SOURCE_KEYS.worldmap:
      return naturalEarth(key);
  }
}

/**
 * The same report, held for a few minutes.
 *
 * What every page should call. `loadSourceReport` stays uncached so the admin
 * can ask for the truth after triggering an import, and so a test can read a
 * source without a cache in the way.
 */
export function loadCachedSourceReport(key: SourceKey): Promise<SourceReport> {
  return cachedSourceReport(key, loadSourceReport);
}
