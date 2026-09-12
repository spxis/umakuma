import { FEATURE_KINDS, isFeatureArea, isFeatureKind, type FeatureArea, type FeatureKind } from "./featureTimeline";

/**
 * A ticket: a piece of work, from asked-for to shipped.
 *
 * The release timeline is a file in the repository, so the running site cannot
 * add to it — an agent commits an entry, the site would lose one on the next
 * deploy. A ticket is the other direction: typed into the admin board or
 * added by an agent, stored in the database, and read by every session at once
 * to turn it into real planned work.
 *
 * Pure rules only, so the CLI and the API can share them without either one
 * dragging in the other's Prisma client.
 */

/**
 * Where a ticket is in its life.
 *
 * Values are added and never renamed: a Postgres enum member cannot change
 * under rows that already use it. `filed` is the first board's word for open
 * and still sits on old rows, so it reads as waiting and nothing new writes it.
 */
export const TICKET_STATUSES = {
  /** Asked for, waiting for somebody to pick it up. */
  open: "open",
  /** Somebody has it. `claimedBy` says who; the hold expires if not renewed. */
  inProgress: "in_progress",
  /** Done. `filedAs` names the timeline entry that records the release. */
  shipped: "shipped",
  /** Answered no. Kept, because a board that forgets is asked twice. */
  declined: "declined",
  /** The first board's word for open. Legacy, read as waiting. */
  filed: "filed",
} as const;

export type TicketStatus = (typeof TICKET_STATUSES)[keyof typeof TICKET_STATUSES];

export const TICKET_STATUS_VALUES = Object.values(TICKET_STATUSES);

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TICKET_STATUSES.open]: "Waiting",
  [TICKET_STATUSES.inProgress]: "In progress",
  [TICKET_STATUSES.shipped]: "Shipped",
  [TICKET_STATUSES.declined]: "Declined",
  [TICKET_STATUSES.filed]: "Waiting",
};

/**
 * How much a ticket matters and how much work it is.
 *
 * Two axes because they are independent: a valuable hard thing and a trivial
 * easy thing score the same on one number, and telling them apart is the
 * point of grading at all. Both are null until somebody grades the row - a
 * default of "normal" would put a judgement nobody made onto every row, where
 * it could not be told from one somebody did make. The contract both boards
 * follow is docs/plans/board-convergence/BOARD_RULES.md.
 */
export const TICKET_PRIORITIES = { high: "high", normal: "normal", low: "low" } as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[keyof typeof TICKET_PRIORITIES];
export const TICKET_PRIORITY_VALUES = Object.values(TICKET_PRIORITIES);
/** Most pressing first, so a sort reads straight down it. */
export const TICKET_PRIORITY_ORDER: readonly TicketPriority[] = [
  TICKET_PRIORITIES.high,
  TICKET_PRIORITIES.normal,
  TICKET_PRIORITIES.low,
];

export const TICKET_EFFORTS = { small: "small", medium: "medium", large: "large" } as const;
export type TicketEffort = (typeof TICKET_EFFORTS)[keyof typeof TICKET_EFFORTS];
export const TICKET_EFFORT_VALUES = Object.values(TICKET_EFFORTS);
/** Least work first, which is the order a quick win is read in. */
export const TICKET_EFFORT_ORDER: readonly TicketEffort[] = [
  TICKET_EFFORTS.small,
  TICKET_EFFORTS.medium,
  TICKET_EFFORTS.large,
];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TICKET_PRIORITIES.high]: "High",
  [TICKET_PRIORITIES.normal]: "Normal",
  [TICKET_PRIORITIES.low]: "Low",
};

export const TICKET_EFFORT_LABELS: Record<TicketEffort, string> = {
  [TICKET_EFFORTS.small]: "Small",
  [TICKET_EFFORTS.medium]: "Medium",
  [TICKET_EFFORTS.large]: "Large",
};

export function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === "string" && (TICKET_PRIORITY_VALUES as string[]).includes(value);
}

export function isTicketEffort(value: unknown): value is TicketEffort {
  return typeof value === "string" && (TICKET_EFFORT_VALUES as string[]).includes(value);
}

/** An ungraded row sorts after every graded one, not in the middle of them. */
function gradeRank<T extends string>(order: readonly T[], value: T | null): number {
  return value === null ? order.length : order.indexOf(value);
}

/**
 * Worth doing, and doable: down by how much it matters, then up by how much
 * work it is, then most recently moved first. The question a reader is
 * asking the board - what could I pick up now - is the top of this list.
 */
export function compareTicketsByQuickWin(
  a: { priority: TicketPriority | null; effort: TicketEffort | null; movedAt: string },
  b: { priority: TicketPriority | null; effort: TicketEffort | null; movedAt: string },
): number {
  return (
    gradeRank(TICKET_PRIORITY_ORDER, a.priority) - gradeRank(TICKET_PRIORITY_ORDER, b.priority) ||
    gradeRank(TICKET_EFFORT_ORDER, a.effort) - gradeRank(TICKET_EFFORT_ORDER, b.effort) ||
    b.movedAt.localeCompare(a.movedAt)
  );
}

/**
 * Where a move on the board can land.
 *
 * Three places, and `shipped` is deliberately not one of them. Shipping is
 * `pnpm release:take`'s job, because it writes the timeline entry and marks
 * the ticket in one pass so the two cannot drift - and the admin page had a
 * "Mark shipped" button that produced the one state the rest of the system
 * says cannot exist: shipped, with no entry to point at. Typed as a narrower
 * union than `TicketStatus` so that offering it again is a type error, not a
 * line somebody adds back.
 */
export const TICKET_MOVE_TARGETS = {
  open: TICKET_STATUSES.open,
  inProgress: TICKET_STATUSES.inProgress,
  declined: TICKET_STATUSES.declined,
} as const;

export type TicketMoveTarget = (typeof TICKET_MOVE_TARGETS)[keyof typeof TICKET_MOVE_TARGETS];

export const TICKET_MOVE_TARGET_VALUES = Object.values(TICKET_MOVE_TARGETS);

/**
 * The moves offered from each state, and only the ones that mean something.
 *
 * A shipped ticket has nowhere to go: the release that closed it is in the
 * timeline and moving the ticket would not unship it. Declined can come back,
 * because saying no is a decision people change.
 *
 * This is the rule, not a menu: the route that acts on a move asks it too.
 * It used to be applied by the buttons alone, so a PATCH with any status in
 * it went through - shipped to open, say, which also cleared the entry the
 * ticket was shipped as and left `release:take` free to number it again.
 */
export const TICKET_MOVES: Record<TicketStatus, TicketMoveTarget[]> = {
  [TICKET_STATUSES.open]: [TICKET_MOVE_TARGETS.inProgress, TICKET_MOVE_TARGETS.declined],
  [TICKET_STATUSES.filed]: [TICKET_MOVE_TARGETS.inProgress, TICKET_MOVE_TARGETS.declined],
  [TICKET_STATUSES.inProgress]: [TICKET_MOVE_TARGETS.open, TICKET_MOVE_TARGETS.declined],
  [TICKET_STATUSES.declined]: [TICKET_MOVE_TARGETS.open],
  [TICKET_STATUSES.shipped]: [],
};

export function canMoveTicket(from: TicketStatus, to: TicketMoveTarget): boolean {
  return TICKET_MOVES[from].includes(to);
}

/**
 * Whether a shipped ticket's stamp actually reached main.
 *
 * `release:take` marks the ticket shipped when it stamps the files, which is
 * before preflight and the push - so a chain stopped after the stamp leaves
 * a ticket reading Shipped under a version that never landed, and the move
 * table rightly offers no way out of Shipped. This is the one exception: a
 * stamp is only a ship once the entry it was filed as sits on origin/main
 * with a version. Given the published timeline, not the local one, for the
 * same reason `release:take` reads it - the local file is what was stamped.
 */
export function stampReachedMain(
  filedAs: string | null,
  published: readonly { id: string; version?: string | null }[],
): boolean {
  if (!filedAs) return false;
  return published.some((entry) => entry.id === filedAs && Boolean(entry.version));
}

/**
 * What a move button says.
 *
 * The destination as a verb, not as a noun: a button reading "Declined" tells
 * you the state it would leave behind rather than what pressing it does. The
 * one that depends on where you are coming from is `open` - putting work back
 * is not the same act as changing your mind about a no.
 */
export function ticketMoveLabel(from: TicketStatus, to: TicketMoveTarget): string {
  if (to === TICKET_MOVE_TARGETS.open) return from === TICKET_STATUSES.declined ? "Reopen" : "Put back";
  if (to === TICKET_MOVE_TARGETS.inProgress) return "Start";
  return "Decline";
}

/**
 * The columns a move writes, and it is never the status alone.
 *
 * In progress is not a status; it is a claim. `claimedBy` and `claimedAt` are
 * the one place work-in-progress is recorded, and the board reads them, not
 * the column - so a status written on its own is two fields that can
 * disagree, and did the moment it was possible: Start left a ticket in
 * progress with nobody holding it, and Put back left the holder on a ticket
 * the page called waiting, where the CLI's `claim` then refused it for the
 * length of the lease. Same shape the CLI writes, so the two writers agree.
 *
 * `filedAs` is cleared on every move. Nothing a move can reach has an entry
 * to point at; the only rows carrying one are the legacy `filed` ones, and a
 * pointer to an entry that was retired is not worth keeping.
 */
export function ticketMoveData(to: TicketMoveTarget, actor: string, now: Date) {
  if (to === TICKET_MOVE_TARGETS.inProgress) {
    return { status: to, claimedBy: actor, claimedAt: now, filedAs: null, movedAt: now };
  }
  return { status: to, claimedBy: null, claimedAt: null, filedAs: null, movedAt: now };
}

/**
 * The condition a move is written under, so the database decides who wins.
 *
 * The status has to still be the one the move was planned from - two admins,
 * or an admin and an agent, do not both get to move a ticket that only one of
 * them read. And a live hold belongs to whoever has it: an admin may move a
 * ticket nobody holds, one they hold themselves, or one whose hold has
 * lapsed, and is otherwise told to ask the holder - which is the CLI's rule,
 * and the reason two agents building the same thing is the failure this
 * board exists to prevent. `staleBefore` is the lease boundary, passed in so
 * the rule is testable without a clock.
 */
export function ticketMoveWhere(id: string, from: TicketStatus, actor: string, staleBefore: Date) {
  return {
    id,
    status: from,
    OR: [{ claimedBy: null }, { claimedBy: actor }, { claimedAt: { lt: staleBefore } }],
  };
}

/** Work nobody has started, whichever word the row uses for it. */
export function isWaitingStatus(status: string): boolean {
  return status === TICKET_STATUSES.open || status === TICKET_STATUSES.filed;
}

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUS_VALUES as string[]).includes(value);
}

export type Ticket = {
  id: string;
  title: string;
  detail: string | null;
  /** Null when whoever asked did not know, or did not care, which area. */
  area: FeatureArea | null;
  kind: FeatureKind;
  status: TicketStatus;
  filedAs: string | null;
  requestedBy: string | null;
  /** The agent holding it, and when the hold was last renewed. */
  claimedBy: string | null;
  claimedAt: string | null;
  /** Null until somebody has judged it; see TICKET_PRIORITIES. */
  priority: TicketPriority | null;
  effort: TicketEffort | null;
  createdAt: string;
  /** When the status last changed. Grading and edits leave it alone. */
  movedAt: string;
};

/**
 * What a usable ticket looks like, in numbers. The same four numbers are
 * `@db.VarChar` caps in the schema, because a cap that lives only here is
 * another door rather than a lock: production once held a 13,573-character
 * detail written by a script that asked nobody.
 */
export const TICKET_LIMITS = {
  titleMin: 8,
  title: 120,
  detail: 4000,
  requestedBy: 60,
  claimedBy: 80,
} as const;

/**
 * What is wrong with a draft, in words a person can act on; empty means it
 * may be added. The form, the route and the CLI all ask this, so a title too
 * short to mean anything is refused the same way from all three.
 */
export function ticketDraftProblems(draft: {
  title: string;
  detail: string | null;
  requestedBy: string | null;
}): string[] {
  const problems: string[] = [];
  const title = draft.title.trim();
  if (title.length < TICKET_LIMITS.titleMin) {
    problems.push(`Say what is wanted in at least ${TICKET_LIMITS.titleMin} characters.`);
  }
  if (title.length > TICKET_LIMITS.title) {
    problems.push(`A title is at most ${TICKET_LIMITS.title} characters; the rest belongs in the detail.`);
  }
  if ((draft.detail ?? "").length > TICKET_LIMITS.detail) {
    problems.push(`The detail is at most ${TICKET_LIMITS.detail.toLocaleString("en-CA")} characters.`);
  }
  if ((draft.requestedBy ?? "").trim().length > TICKET_LIMITS.requestedBy) {
    problems.push(`A name is at most ${TICKET_LIMITS.requestedBy} characters.`);
  }
  return problems;
}

/**
 * The database columns are plain strings, because areas and kinds are
 * TypeScript unions that change with the code and a Postgres enum would have
 * to be migrated every time one did. So a row is narrowed on the way out and
 * an unrecognised value falls back rather than reaching a component that only
 * handles the ones it knows.
 */
export function toTicket(row: {
  id: string;
  title: string;
  detail: string | null;
  area: string | null;
  kind: string;
  status: string;
  filedAs: string | null;
  requestedBy: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  priority: string | null;
  effort: string | null;
  createdAt: Date;
  movedAt: Date;
}): Ticket {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    claimedBy: row.claimedBy,
    claimedAt: row.claimedAt?.toISOString() ?? null,
    priority: isTicketPriority(row.priority) ? row.priority : null,
    effort: isTicketEffort(row.effort) ? row.effort : null,
    movedAt: row.movedAt.toISOString(),
    area: row.area && isFeatureArea(row.area) ? row.area : null,
    kind: isFeatureKind(row.kind) ? row.kind : FEATURE_KINDS.feature,
    status: isTicketStatus(row.status) ? row.status : TICKET_STATUSES.open,
    filedAs: row.filedAs,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export function openWishes(tickets: readonly Ticket[]): Ticket[] {
  return tickets.filter((ticket) => ticket.status === TICKET_STATUSES.open);
}

/**
 * Asked for and not started, whichever word the row uses for it.
 *
 * `filed` is the first board's spelling of `open` and rows still carry it, so
 * a count that asked only about `open` would under-report the queue by however
 * many of those are left.
 */
export function isWaitingTicket(status: TicketStatus): boolean {
  return status === TICKET_STATUSES.open || status === TICKET_STATUSES.filed;
}

/*
 * Dropped before an id is cut to length, so the four words kept are four that
 * say something. "Furigana toggle on the reading pages" became
 * `furigana-toggle-on-the` without this - an id ending on an article.
 */
const ID_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "is", "it",
  "of", "on", "or", "the", "to", "with",
]);

/**
 * The timeline id a ticket would be filed under, suggested from its title.
 *
 * Only a suggestion: the agent filing it may know a better name, and a
 * collision with an existing id is refused by `addEntry`. Kebab-case and short,
 * because that is what every id in the file already looks like.
 */
export function suggestedEntryId(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter(Boolean);

  const kept = words.filter((word) => !ID_STOP_WORDS.has(word));
  return (kept.length > 0 ? kept : words).slice(0, 4).join("-") || "ticket";
}
