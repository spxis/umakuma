import "server-only";

import { prisma } from "@/lib/prisma";

import {
  TICKET_STATUSES,
  canMoveTicket,
  isTicketStatus,
  ticketMoveData,
  ticketMoveWhere,
  toTicket,
  type Ticket,
  type TicketMoveTarget,
  type TicketStatus,
} from "@/lib/tickets";
import { TASK_LEASE_MS } from "@/lib/ticketClaims";
import type { FeatureArea, FeatureKind } from "@/lib/featureTimeline";

/**
 * Wish list reads and writes, for the admin page and its API.
 *
 * Split from `featureWishes.ts` the way `featureFlagsServer` is split from
 * `featureFlags`: the rules are shared with the backlog CLI, which has no
 * business importing a server-only Prisma singleton.
 */

const SELECT = {
  id: true,
  title: true,
  detail: true,
  area: true,
  kind: true,
  status: true,
  filedAs: true,
  requestedBy: true,
  claimedBy: true,
  claimedAt: true,
  createdAt: true,
} as const;

/** Newest first: a ticket list is read to see what has just been asked for. */
export async function listTickets(): Promise<Ticket[]> {
  const rows = await prisma.ticket.findMany({
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toTicket);
}

export type TicketDraft = {
  title: string;
  detail: string | null;
  area: FeatureArea | null;
  kind: FeatureKind;
  requestedBy: string | null;
};

export async function createTicket(draft: TicketDraft): Promise<Ticket> {
  const row = await prisma.ticket.create({
    data: {
      title: draft.title,
      detail: draft.detail,
      area: draft.area,
      kind: draft.kind,
      requestedBy: draft.requestedBy,
      status: TICKET_STATUSES.open,
    },
    select: SELECT,
  });
  return toTicket(row);
}

export type TicketMoveOutcome =
  | { ok: true; ticket: Ticket }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "illegal"; from: TicketStatus }
  | { ok: false; reason: "held"; heldBy: string };

/**
 * Moves a ticket the way the CLI does: legally, and with its claim.
 *
 * Reads the row for the message, then writes under a condition rather than
 * trusting what it read, the way `pnpm task claim` does - two round trips are
 * two chances for somebody else to get there first, so the condition goes
 * into the UPDATE and the database decides. A write that matches no row is
 * re-read to say why.
 */
export async function moveTicket(
  id: string,
  to: TicketMoveTarget,
  actor: string,
  now: Date = new Date(),
): Promise<TicketMoveOutcome> {
  const current = await prisma.ticket.findUnique({ where: { id }, select: { status: true } });
  if (!current) return { ok: false, reason: "missing" };

  const from = isTicketStatus(current.status) ? current.status : TICKET_STATUSES.open;
  if (!canMoveTicket(from, to)) return { ok: false, reason: "illegal", from };

  const staleBefore = new Date(now.getTime() - TASK_LEASE_MS);
  const moved = await prisma.ticket.updateMany({
    where: ticketMoveWhere(id, from, actor, staleBefore),
    data: ticketMoveData(to, actor, now),
  });

  if (moved.count === 0) {
    const holder = await prisma.ticket.findUnique({ where: { id }, select: { claimedBy: true } });
    return { ok: false, reason: "held", heldBy: holder?.claimedBy ?? "somebody" };
  }

  const row = await prisma.ticket.findUniqueOrThrow({ where: { id }, select: SELECT });
  return { ok: true, ticket: toTicket(row) };
}
