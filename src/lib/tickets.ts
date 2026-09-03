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
 * The moves offered from each state, and only the ones that mean something.
 *
 * A shipped ticket has nowhere to go: the release that closed it is in the
 * timeline and moving the ticket would not unship it. Declined can come back,
 * because saying no is a decision people change.
 */
export const TICKET_MOVES: Record<TicketStatus, TicketStatus[]> = {
  [TICKET_STATUSES.open]: [TICKET_STATUSES.inProgress, TICKET_STATUSES.declined],
  [TICKET_STATUSES.filed]: [TICKET_STATUSES.inProgress, TICKET_STATUSES.declined],
  [TICKET_STATUSES.inProgress]: [TICKET_STATUSES.open, TICKET_STATUSES.shipped, TICKET_STATUSES.declined],
  [TICKET_STATUSES.declined]: [TICKET_STATUSES.open],
  [TICKET_STATUSES.shipped]: [],
};

/**
 * What a move button says.
 *
 * The destination as a verb, not as a noun: a button reading "Declined" tells
 * you the state it would leave behind rather than what pressing it does. The
 * one that depends on where you are coming from is `open` - putting work back
 * is not the same act as changing your mind about a no.
 */
export function ticketMoveLabel(from: TicketStatus, to: TicketStatus): string {
  if (to === TICKET_STATUSES.open) return from === TICKET_STATUSES.declined ? "Reopen" : "Put back";
  if (to === TICKET_STATUSES.inProgress) return "Start";
  if (to === TICKET_STATUSES.shipped) return "Mark shipped";
  return "Decline";
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
  createdAt: string;
};

export const TICKET_LIMITS = {
  title: 120,
  detail: 2000,
} as const;

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
  createdAt: Date;
}): Ticket {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    claimedBy: row.claimedBy,
    claimedAt: row.claimedAt?.toISOString() ?? null,
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
