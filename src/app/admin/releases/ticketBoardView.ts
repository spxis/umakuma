import type { FeatureArea, FeatureKind } from "@/lib/featureTimeline";
import { heldNow } from "@/lib/ticketClaims";
import { TICKET_STATUSES, compareTicketsByQuickWin, type Ticket } from "@/lib/tickets";

/**
 * How the admin board is narrowed and ordered. Pure: a list goes in, a new
 * list comes out, and the page, the tests and the counts beside the chips
 * all get the same answer from the same list. Ported from Itsutsu's
 * `backlog.ts`, which had this shape first.
 */

/**
 * A lane is a status read through the lease.
 *
 * The column says `in_progress`; the lease says whether anybody is actually
 * there. A hold past six hours is `stale`: somebody started it and went
 * quiet, and a reader should know that before starting it again. `filed` is
 * the first board's word for open and reads as waiting.
 */
export type TicketLane = "held" | "waiting" | "stale" | "shipped" | "declined";

/** In the order the board reads them: what is moving, then what is settled. */
export const TICKET_LANE_ORDER: readonly TicketLane[] = ["held", "waiting", "stale", "shipped", "declined"];

export function ticketLane(ticket: Ticket, nowMs: number = Date.now()): TicketLane {
  if (ticket.status === TICKET_STATUSES.shipped) return "shipped";
  if (ticket.status === TICKET_STATUSES.declined) return "declined";
  if (heldNow(ticket, nowMs)) return "held";
  if (ticket.claimedBy) return "stale";
  return "waiting";
}

/** Still wanting something from somebody: waiting, held, or dropped mid-way. */
export function isUnfinished(ticket: Ticket, nowMs: number = Date.now()): boolean {
  const lane = ticketLane(ticket, nowMs);
  return lane === "held" || lane === "waiting" || lane === "stale";
}

export type TicketLaneFilter = TicketLane | "all" | "unfinished";

export type TicketSort = "status" | "quickWins" | "moved" | "newest" | "oldest";

export const TICKET_SORT_VALUES: readonly TicketSort[] = ["status", "quickWins", "moved", "newest", "oldest"];

export type TicketBoardView = {
  lane: TicketLaneFilter;
  kind: FeatureKind | "all";
  area: FeatureArea | "all";
  text: string;
  sort: TicketSort;
};

export const TICKET_BOARD_START: TicketBoardView = { lane: "unfinished", kind: "all", area: "all", text: "", sort: "status" };

function matchesLane(ticket: Ticket, filter: TicketLaneFilter, nowMs: number): boolean {
  if (filter === "all") return true;
  if (filter === "unfinished") return isUnfinished(ticket, nowMs);
  return ticketLane(ticket, nowMs) === filter;
}

function matchesText(ticket: Ticket, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (needle === "") return true;
  return (
    ticket.title.toLowerCase().includes(needle) ||
    (ticket.detail ?? "").toLowerCase().includes(needle) ||
    (ticket.requestedBy ?? "").toLowerCase().includes(needle) ||
    ticket.id.toLowerCase().includes(needle)
  );
}

export function filterTickets(tickets: readonly Ticket[], view: TicketBoardView, nowMs: number = Date.now()): Ticket[] {
  return tickets.filter(
    (ticket) =>
      matchesLane(ticket, view.lane, nowMs) &&
      (view.kind === "all" || ticket.kind === view.kind) &&
      (view.area === "all" || ticket.area === view.area) &&
      matchesText(ticket, view.text),
  );
}

const BY_MOVED = (a: Ticket, b: Ticket) => b.movedAt.localeCompare(a.movedAt);

/** A new array, never in place: the page hands one list to two views. */
export function sortTickets(tickets: readonly Ticket[], sort: TicketSort, nowMs: number = Date.now()): Ticket[] {
  const copy = [...tickets];
  if (sort === "newest") return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "oldest") return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (sort === "moved") return copy.sort(BY_MOVED);
  if (sort === "quickWins") return copy.sort(compareTicketsByQuickWin);
  return copy.sort((a, b) => {
    const rank = TICKET_LANE_ORDER.indexOf(ticketLane(a, nowMs)) - TICKET_LANE_ORDER.indexOf(ticketLane(b, nowMs));
    return rank !== 0 ? rank : BY_MOVED(a, b);
  });
}

/** How many stand in each lane. Every lane is present, zero included. */
export function tallyTickets(tickets: readonly Ticket[], nowMs: number = Date.now()): Record<TicketLane, number> {
  const counts: Record<TicketLane, number> = { held: 0, waiting: 0, stale: 0, shipped: 0, declined: 0 };
  for (const ticket of tickets) counts[ticketLane(ticket, nowMs)] += 1;
  return counts;
}

/**
 * The list broken by lane, for the "by status" order over a mixed filter.
 * Null when the headings would lie about the order, or there is one lane.
 */
export function groupTicketsByLane(
  sorted: readonly Ticket[],
  view: TicketBoardView,
  nowMs: number = Date.now(),
): { lane: TicketLane; tickets: Ticket[] }[] | null {
  if (view.sort !== "status" || (view.lane !== "all" && view.lane !== "unfinished")) return null;
  const groups = TICKET_LANE_ORDER.map((lane) => ({
    lane,
    tickets: sorted.filter((ticket) => ticketLane(ticket, nowMs) === lane),
  })).filter((group) => group.tickets.length > 0);
  return groups.length > 1 ? groups : null;
}
