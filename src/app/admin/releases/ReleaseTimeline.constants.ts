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
  inProgressLabel: "in progress",
  emptyPlanned: "Nothing queued.",
  inProgress: "In progress",
  queueHeading: "In queue order",
  queueNounPlanned: "planned",
  queueNounClaimed: "claimed",
  queueNounParked: "parked",
  queueNounCancelled: "cancelled",
  queuePosition: (position: number) => `#${position}`,
  bug: "Bug",
  inProgressHeading: "In progress",
  inProgressLegend:
    "Claimed work, and who has it. A claim is what in progress means here, so this tab is the claims - nothing is marked in progress by hand.",
  emptyInProgress: "Nobody is building anything right now.",
  backlogHeading: "Backlog",
  backlogLegend: "Parked, still wanted, not in the release order. Pick one up by planning it.",
  emptyBacklog: "Nothing parked.",
  cancelledHeading: "Cancelled",
  cancelledLegend: "Decided against, kept on the record rather than vanishing, so it is not proposed twice.",
  emptyCancelled: "Nothing cancelled.",
  wishHeading: "Wish list",
  wishLegend:
    "Asked for, not yet agreed to. The timeline is a file in the repository and the site cannot write to it, so a wish waits here until an agent files it as planned work.",
  wishEmpty: "No wishes yet.",
  wishAdd: "Add a wish",
  wishTitleLabel: "What do you want?",
  wishTitlePlaceholder: "One line, the way you would say it",
  wishDetailLabel: "Anything else (optional)",
  wishDetailPlaceholder: "Why it matters, what it should do, where you saw the problem",
  wishAreaLabel: "Area",
  wishAreaAny: "Not sure",
  wishKindLabel: "Kind",
  wishSubmit: "Add to the wish list",
  wishSubmitting: "Adding\u2026",
  wishDecline: "Decline",
  wishReopen: "Reopen",
  wishFiledAs: "Filed as",
  wishRequestedBy: "Asked by",
  wishError: "That did not save. Try again.",
  /* The loop the wish list closes, spelled out where the wishes are read. */
  wishHowFiled: (wishId: string) => `pnpm backlog file ${wishId} <area>`,
} as const;

export const RELEASE_TABS = {
  inProgress: "in-progress",
  planned: "planned",
  released: "released",
  backlog: "backlog",
  cancelled: "cancelled",
  wishes: "wishes",
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
