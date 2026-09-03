import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { TICKET_STATUS_VALUES, type TicketStatus } from "@/lib/tickets";
import { setTicketStatus } from "@/lib/ticketsServer";

/**
 * Declining a wish, and changing its mind again.
 *
 * There is no delete. A wish list that forgets what was answered no gets asked
 * the same thing again, which is the whole reason the timeline keeps cancelled
 * work on the record rather than removing it.
 */
const statusSchema = z.object({
  status: z.enum(TICKET_STATUS_VALUES as [string, ...string[]]),
});

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
      const wish = await setTicketStatus(ticketId, parsed.data.status as TicketStatus);
      if (!wish) {
        return NextResponse.json({ error: "No such wish." }, { status: 404 });
      }

      return NextResponse.json({ wish });
    },
  });
}
