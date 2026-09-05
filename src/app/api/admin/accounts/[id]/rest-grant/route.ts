import { NextResponse } from "next/server";
import { z } from "zod";

import { adminEmail, isAuthorizedAdmin } from "@/lib/admin";
import { adminAccountDetailResponse } from "@/lib/adminAccountDetail";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { MAX_TIME_OFF_GRANT_DAYS } from "@/lib/xp/xpRest";
import { grantTimeOff } from "@/lib/xp/xpRestServer";

const bodySchema = z.object({
  /* The same two values `MemberRestKind` holds. Written as an enum of the
     enum's own members rather than a fresh list of strings, so a third kind
     added to the schema is a compile error here rather than a route that
     silently refuses it. */
  kind: z.enum(["rest", "vacation"]),
  days: z.coerce.number().int().min(1).max(MAX_TIME_OFF_GRANT_DAYS),
  note: z.string().trim().max(280).nullish(),
});

/**
 * Handing a member extra days off.
 *
 * Additive to what their rank earns, never a replacement for it - see the
 * schema comment on `MemberRestGrant` for why an override column was the wrong
 * shape. The grant carries the admin's address and their reason, which is the
 * audit the XP awards still have not got.
 *
 * There is no route to revoke one yet, deliberately: a member may already have
 * booked a holiday against a grant, so taking it back is a different act with
 * a different confirmation, and nobody has needed it. Deleting the row is the
 * escape hatch until somebody does.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]/rest-grant",
    method: "POST",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { id } = await context.params;
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid request payload." },
            { status: 400 },
          );
        }

        const account = await prisma.account.findUnique({ where: { id }, select: { id: true } });
        if (!account) {
          return NextResponse.json({ error: "No such account." }, { status: 404 });
        }

        const result = await grantTimeOff({
          accountId: id,
          kind: parsed.data.kind,
          days: parsed.data.days,
          note: parsed.data.note,
          grantedBy: await adminEmail(request),
        });

        /* The refusal is the reason. The Zod schema already covers the range,
           so reaching this means the two disagree, and saying so is worth more
           than a generic failure. */
        if (!result.ok) {
          return NextResponse.json(
            { error: `A grant is between 1 and ${MAX_TIME_OFF_GRANT_DAYS} days.` },
            { status: 400 },
          );
        }

        return adminAccountDetailResponse(id);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not grant those days." }, { status: 500 });
      }
    },
  });
}
