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

export const RELEASE_TABS = {
  planned: "planned",
  released: "released",
} as const;

export type ReleaseTab = (typeof RELEASE_TABS)[keyof typeof RELEASE_TABS];

export const RELEASE_TAB_VALUES = Object.values(RELEASE_TABS);

export const RELEASE_TAB_COOKIE_KEY = "admin-releases-tab";

/**
 * One accent per area so a month's worth of entries can be scanned by colour.
 * Tailwind needs the full class name in the source, so these are written out.
 */
export const RELEASE_AREA_CLASSES: Record<FeatureArea, string> = {
  [FEATURE_AREAS.study]: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  [FEATURE_AREAS.games]: "border-violet-500/40 bg-violet-500/10 text-violet-600",
  [FEATURE_AREAS.jlpt]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  [FEATURE_AREAS.news]: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  [FEATURE_AREAS.reading]: "border-rose-500/40 bg-rose-500/10 text-rose-600",
  [FEATURE_AREAS.account]: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700",
  [FEATURE_AREAS.admin]: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  [FEATURE_AREAS.platform]: "border-slate-500/40 bg-slate-500/10 text-slate-600",
};
