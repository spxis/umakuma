import type { CatalogGapReport } from "@/lib/wanikani/catalogGapReport";

/**
 * What the catalogue panel says.
 *
 * Here rather than in the component so the sentences that only appear when
 * something is wrong can be tested: production holds every subject the app
 * asks for, so the gap wording is a branch a screenshot cannot reach.
 */

const count = (value: number) => value.toLocaleString();

export const CATALOG_GAP_COPY = {
  title: "Catalogue gap",
  measure: "Measure gap",
  measuring: "Measuring...",
  working: "Reading every account's assignments and every held row's relations. This takes a moment.",
  blurb:
    "What the app would ask the catalogue for and it cannot answer. Anything missing falls through to the WaniKani API on every request that wants it.",
  backfill: "pnpm db:backfill:wk-catalog --apply",
  backfillHint: ", which inserts and never updates.",
  failed: "Could not measure the catalogue gap.",

  headline: (report: CatalogGapReport): string =>
    report.missingCount === 0
      ? `Nothing missing. All ${count(report.wantedCount)} wanted subject(s) are held.`
      : `${count(report.missingCount)} of ${count(report.wantedCount)} wanted subject(s) are missing.`,

  toast: (report: CatalogGapReport): string =>
    report.missingCount === 0
      ? "The catalogue holds everything the app asks for."
      : `${count(report.missingCount)} subject(s) missing from the catalogue.`,

  /* The heading admits the cap, so a capped list never reads as the whole gap. */
  idsHeading: (report: CatalogGapReport): string =>
    report.truncated ? `Missing ids (first ${count(report.missing.length)})` : "Missing ids",

  held: (report: CatalogGapReport): string =>
    `Held rows: ${count(report.heldCount)}. Measured ${new Date(report.measuredAt).toLocaleTimeString()}.`,
} as const;
