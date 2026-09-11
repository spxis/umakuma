import { NextResponse } from "next/server";
import { z } from "zod";

import { adminEmail, isAuthorizedAdmin } from "@/lib/admin";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/apiRateLimit";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  TICKET_EFFORT_VALUES,
  TICKET_MOVE_TARGET_VALUES,
  TICKET_PRIORITY_VALUES,
  TICKET_STATUS_LABELS,
  type TicketMoveTarget,
} from "@/lib/tickets";
import { ADMIN_TICKETS_RATE_LIMIT } from "@/lib/ticketsApi";
import { gradeTicket, moveTicket, type TicketGrade } from "@/lib/ticketsServer";

/**
 * Moving a ticket along the board, and grading it.
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
 *
 * A partial body rather than a union of shapes, the way Itsutsu's board takes
 * it: every field optional and at least one present, so grading a row and
 * moving it are one call and adding a field is not a third arm. `null` for a
 * grade is a real value - it ungrades - and omitting it changes nothing.
 */
const patchSchema = z
  .object({
    status: z.enum(TICKET_MOVE_TARGET_VALUES as [string, ...string[]]).optional(),
    priority: z.enum(TICKET_PRIORITY_VALUES as [string, ...string[]]).nullable().optional(),
    effort: z.enum(TICKET_EFFORT_VALUES as [string, ...string[]]).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "empty" });

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
      const limit = checkRateLimit(`admin-tickets:${getClientIp(request)}`, ADMIN_TICKETS_RATE_LIMIT);
      if (!limit.allowed) return createRateLimitResponse(limit);

      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = patchSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const { ticketId } = await context.params;
      const { status, ...grade } = parsed.data;

      /*
       * The move first, and only once; the grade second. A refused move
       * returns before any grade is written, so a body carrying both leaves
       * the row exactly where it stood rather than half-applied.
       */
      let wish = null;
      if (status !== undefined) {
        const actor = (await adminEmail(request)) ?? "admin";
        const outcome = await moveTicket(ticketId, status as TicketMoveTarget, actor);
        if (!outcome.ok) {
          if (outcome.reason === "missing") return NextResponse.json({ error: "No such ticket." }, { status: 404 });
          if (outcome.reason === "illegal") return NextResponse.json({ error: REFUSED.illegal(outcome.from) }, { status: 409 });
          return NextResponse.json({ error: REFUSED.held(outcome.heldBy) }, { status: 409 });
        }
        wish = outcome.ticket;
      }
      if (Object.keys(grade).length > 0) {
        wish = await gradeTicket(ticketId, grade as TicketGrade);
        if (!wish) return NextResponse.json({ error: "No such ticket." }, { status: 404 });
      }

      return NextResponse.json({ wish });
    },
  });
}
