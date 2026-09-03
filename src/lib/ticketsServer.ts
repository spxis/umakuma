import "server-only";

import { prisma } from "@/lib/prisma";

import {
  TICKET_STATUSES,
  toTicket,
  type Ticket,
  type TicketStatus,
} from "@/lib/tickets";
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

/**
 * Moves a ticket between states.
 *
 * `filedAs` is cleared on anything but `filed`, so a ticket that was filed and
 * then reopened does not keep pointing at an entry it is no longer connected
 * to.
 */
export async function setTicketStatus(
  id: string,
  status: TicketStatus,
  filedAs: string | null = null,
): Promise<Ticket | null> {
  const row = await prisma.ticket
    .update({
      where: { id },
      data: { status, filedAs: status === TICKET_STATUSES.filed ? filedAs : null },
      select: SELECT,
    })
    .catch(() => null);
  return row ? toTicket(row) : null;
}
