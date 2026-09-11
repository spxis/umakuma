import { FEATURE_AREAS, type FeatureArea } from "@/lib/featureTimeline";

import type { TicketLane, TicketSort } from "./ticketBoardView";

export const RELEASE_TIMELINE_COPY = {
  title: "Release timeline",
  subtitle: "Everything UmaKuma has shipped, and what is queued next.",
  shippedHeading: "Released",
  historyNote:
    "Dates before today are taken from the commit history, grouped so one feature reads as one line rather than as its individual commits.",
  emptyReleased: "Nothing released yet.",
  waitingLabel: "waiting",
  inProgressLabel: "in progress",
  shippedLabel: "released",
  versionLabel: "live version",
  bug: "Bug",
  ticketsHeading: "Tickets",
  ticketsLegend:
    "Every piece of work, from asked-for to shipped. A ticket is claimed before it is built and shipped by the release script, never by hand; agents read and move these too.",
  ticketsEmpty: "No tickets yet.",
  ticketsNoneShown: "Nothing here under those filters.",
  ticketAdd: "Add a ticket",
  ticketTitleLabel: "What do you want?",
  ticketTitlePlaceholder: "One line, the way you would say it",
  ticketDetailLabel: "Anything else (optional)",
  ticketDetailPlaceholder: "Why it matters, what it should do, where you saw the problem",
  ticketAreaLabel: "Area",
  ticketAreaAny: "Not sure",
  ticketKindLabel: "Kind",
  ticketSubmit: "Add ticket",
  ticketSubmitting: "Adding…",
  ticketFiledAs: "Filed as",
  ticketRequestedBy: "Asked by",
  ticketError: "That did not save. Try again.",
  /* The loop the board closes, spelled out where the tickets are read. */
  ticketHowClaimed: (ticketId: string) => `pnpm task claim ${ticketId} "<who>"`,
  ticketHeldBy: "Held by",
  /* A hold past its lease: somebody started this and went quiet. Free to take. */
  ticketStale: "Stale",
  filterUnfinished: "Unfinished",
  filterAll: "All",
  filterFind: "Find in the board",
  filterKind: "Kind",
  filterEveryKind: "Every kind",
  filterArea: "Area",
  filterEveryArea: "Every area",
  filterSort: "Order",
  filterLanes: "Show",
  shown: (shown: number, total: number) => `${shown} of ${total} shown`,
  priorityLabel: "Priority",
  effortLabel: "Effort",
  ungraded: "Ungraded",
} as const;

/** How each lane of the board reads. A lane is a status read through the lease. */
export const TICKET_LANE_LABELS: Record<TicketLane, string> = {
  held: "In progress",
  waiting: "Waiting",
  stale: "Stale",
  shipped: "Shipped",
  declined: "Declined",
};

export const TICKET_LANE_BLURBS: Record<TicketLane, string> = {
  held: "Somebody holds it, inside the six-hour lease.",
  waiting: "Asked for. Nobody is on it.",
  stale: "Somebody started it and the lease has lapsed. Free to take.",
  shipped: "In a release. The entry it was filed as says which.",
  declined: "Answered no. Kept, so it is not asked twice.",
};

export const TICKET_LANE_CLASSES: Record<TicketLane, string> = {
  held: "border-amber-500/40 bg-amber-400/10 text-amber-800",
  waiting: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  stale: "border-slate-400/50 bg-slate-200/60 text-slate-700",
  shipped: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  declined: "border-line bg-surface-muted text-foreground/60",
};

export const TICKET_SORT_LABELS: Record<TicketSort, string> = {
  status: "By status",
  quickWins: "Quick wins",
  moved: "Last moved",
  newest: "Newest",
  oldest: "Oldest",
};

export const TICKET_FIELD_CLASS =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

/** A select that takes its own width: the field class above fills its row. */
export const TICKET_SELECT_CLASS =
  "rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

export const TICKET_SMALL_SELECT_CLASS =
  "rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

export const RELEASE_TABS = {
  tickets: "tickets",
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
