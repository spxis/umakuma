import { NextResponse } from "next/server";

import { isAuthorizedAdmin } from "@/lib/admin";
import { adminAccountDetailResponse } from "@/lib/adminAccountDetail";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { endVacation } from "@/lib/xp/xpRestServer";

/**
 * Bringing somebody back early.
 *
 * DELETE rather than a POST with a flag, because that is what it is: the
 * vacation stops existing. It runs the member's own `endVacation`, so an admin
 * doing it for somebody gets exactly what the member would have got - every
 * due date shifted forward by however long they were actually away, and the
 * days they did not take given back. Reimplementing any part of that here
 * would be a second answer to "what does coming home mean", and the two would
 * eventually disagree.
 *
 * The point of having it on the admin side is the member who cannot do it
 * themselves: a phone left at home, a child's account, somebody who came back
 * a week early and did not know they had to say so.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]/vacation",
    method: "DELETE",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { id } = await context.params;
        const account = await prisma.account.findUnique({ where: { id }, select: { id: true } });
        if (!account) {
          return NextResponse.json({ error: "No such account." }, { status: 404 });
        }

        const result = await endVacation({ accountId: id });
        /* Not an error: an admin clicking this on somebody who is already back
           has got what they wanted. Saying "they are not away" is the honest
           answer, and it comes back with the detail so the screen refreshes. */
        return adminAccountDetailResponse(id, {
          endedVacation: result.ok,
          shiftedDays: result.shiftedDays,
          itemsShifted: result.itemsShifted,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not end that vacation." }, { status: 500 });
      }
    },
  });
}
