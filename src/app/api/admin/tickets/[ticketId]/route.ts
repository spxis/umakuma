import { NextResponse } from "next/server";
import { z } from "zod";

import { adminEmail, isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { TICKET_MOVE_TARGET_VALUES, TICKET_STATUS_LABELS, type TicketMoveTarget } from "@/lib/tickets";
import { moveTicket } from "@/lib/ticketsServer";

/**
 * Moving a ticket along the board: start it, put it back, decline it, reopen.
 *
 * There is no delete. A wish list that forgets what was answered no gets asked
 * the same thing again, which is the whole reason the timeline keeps cancelled
 * work on the record rather than removing it. And there is no ship: that is
 * `release:take`, which writes the entry the ticket is shipped as in the same
 * pass.
 *
 * The move is checked here, not only where the buttons are drawn. A control
 * hidden is not a control refused: this accepted any status at all, so a
 * shipped ticket could be reopened by a request with nothing on the page
 * offering it.
 */
const statusSchema = z.object({
  status: z.enum(TICKET_MOVE_TARGET_VALUES as [string, ...string[]]),
});

const REFUSED = {
  illegal: (from: string) => `Cannot move a ticket that is ${TICKET_STATUS_LABELS[from as never] ?? from} there.`,
  held: (by: string) => `Held by ${by}. Ask them to release it.`,
} as const;

export async function PATCH(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/tickets/[ticketId]",
    method: "PATCH",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = statusSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const { ticketId } = await context.params;
      const actor = (await adminEmail(request)) ?? "admin";
      const outcome = await moveTicket(ticketId, parsed.data.status as TicketMoveTarget, actor);
      if (!outcome.ok) {
        if (outcome.reason === "missing") return NextResponse.json({ error: "No such wish." }, { status: 404 });
        if (outcome.reason === "illegal") return NextResponse.json({ error: REFUSED.illegal(outcome.from) }, { status: 409 });
        return NextResponse.json({ error: REFUSED.held(outcome.heldBy) }, { status: 409 });
      }

      return NextResponse.json({ wish: outcome.ticket });
    },
  });
}
