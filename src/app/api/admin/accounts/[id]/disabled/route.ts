import { NextResponse } from "next/server";
import { z } from "zod";

import { adminEmail, isAuthorizedAdmin } from "@/lib/admin";
import { adminAccountDetailResponse } from "@/lib/adminAccountDetail";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  disabled: z.boolean(),
  reason: z.string().trim().max(280).nullish(),
});

/**
 * Switch a member's account off, or back on.
 *
 * Not the same act as rejecting them, and not stored in the same column - see
 * the schema comment on `disabledAt`. Rejection is the answer at the door;
 * this is what happens to somebody already inside, and it has to be reversible
 * without rewriting the record of when they were let in.
 *
 * Enabling clears all three columns rather than leaving the last reason
 * standing. A stale "abuse report, 12 March" on a live account is worse than
 * no record at all, because the next admin to read it has no way to tell that
 * it was already dealt with.
 *
 * The switch is enforced, not merely recorded: `isAccountBarred` reads it, and
 * every entrance - the study and game routes through `accountAccess`, the
 * invite session, the user page and the leaderboard - asks that one predicate.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]/disabled",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { id } = await context.params;
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const existing = await prisma.account.findUnique({ where: { id }, select: { id: true } });
        if (!existing) {
          return NextResponse.json({ error: "No such account." }, { status: 404 });
        }

        const reason = parsed.data.reason?.trim() ?? "";
        await prisma.account.update({
          where: { id },
          data: parsed.data.disabled
            ? {
                disabledAt: new Date(),
                disabledReason: reason.length > 0 ? reason : null,
                disabledBy: await adminEmail(request),
              }
            : { disabledAt: null, disabledReason: null, disabledBy: null },
        });

        return adminAccountDetailResponse(id);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not change that account's standing." }, { status: 500 });
      }
    },
  });
}
