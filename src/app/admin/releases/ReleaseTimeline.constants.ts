import { FEATURE_AREAS, type FeatureArea } from "@/lib/featureTimeline";

export const RELEASE_TIMELINE_COPY = {
  title: "Release timeline",
  subtitle: "Everything UmaKuma has shipped, and what is queued next.",
  shippedHeading: "Released",
  plannedHeading: "Planned",
  estimateNote: "Estimated",
  estimateLegend: "Planned dates are estimates and move as work lands.",
  historyNote:
    "Dates before today are taken from the commit history, grouped so one feature reads as one line rather than as its individual commits.",
  totalsLabel: "features",
  shippedLabel: "released",
  plannedLabel: "planned",
  emptyPlanned: "Nothing queued.",
} as const;

/**
 * One accent per area so a month's worth of entries can be scanned by colour.
 * Tailwind needs the full class name in the source, so these are written out.
 */
export const RELEASE_AREA_CLASSES: Record<FeatureArea, string> = {
  [FEATURE_AREAS.study]: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  [FEATURE_AREAS.games]: "border-violet-400/40 bg-violet-400/10 text-violet-200",
  [FEATURE_AREAS.jlpt]: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  [FEATURE_AREAS.news]: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  [FEATURE_AREAS.reading]: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  [FEATURE_AREAS.account]: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  [FEATURE_AREAS.admin]: "border-orange-400/40 bg-orange-400/10 text-orange-200",
  [FEATURE_AREAS.platform]: "border-slate-400/40 bg-slate-400/10 text-slate-200",
};
