import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { adminAccountDetailResponse } from "@/lib/adminAccountDetail";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { awardXpAsAdmin } from "@/lib/xp/xpServer";

import { ADMIN_XP_AWARD_MAX, adminAwardNote } from "./adminXpAward";

const bodySchema = z.object({
  /* An `XpType.id`, checked against the table rather than against the constants
     in `xpAwards.ts`: the rows are the awards that actually exist, a retired
     kind still has a row, and `XpEvent.kind` has a foreign key onto it. A
     hard-coded list here would be a second list of allowed values, and the
     second list is always the one that drifts. */
  kind: z.string().trim().min(1).max(64),
  /* Positive only. Taking XP back is a different act with different
     consequences - a member can lose a rank they have already been told they
     hold - and it wants its own confirmation and its own record, not a minus
     sign in this box. The ceiling is a guard against a fat finger rather than
     a policy: nothing about the economy says an award may not be large. */
  amount: z.coerce.number().int().min(1).max(ADMIN_XP_AWARD_MAX),
  note: z.string().trim().max(280).nullish(),
});

/**
 * An admin handing a member XP.
 *
 * The cap decision lives with the write, in `awardXpAsAdmin` - short version:
 * the daily cap does not apply, because a cap shapes what a member can earn by
 * grinding and this was not earned by grinding, and silently trimming an
 * award while reporting success would be the worst answer available. What the
 * award *does* do is land on the day's row for its kind like every other
 * award, so choosing a capped kind squeezes what the member's own study can
 * still earn of it today. The panel shows each kind's cap and the day's total
 * beside the amount for exactly that reason.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]/xp",
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

        const [account, type] = await Promise.all([
          prisma.account.findUnique({ where: { id }, select: { id: true } }),
          prisma.xpType.findUnique({ where: { id: parsed.data.kind }, select: { id: true, label: true } }),
        ]);

        if (!account) {
          return NextResponse.json({ error: "No such account." }, { status: 404 });
        }
        /* Named, because "invalid request" would send an admin looking at the
           amount box when the list of kinds is what is out of date. */
        if (!type) {
          return NextResponse.json({ error: `No award type called "${parsed.data.kind}".` }, { status: 400 });
        }

        const result = await awardXpAsAdmin({
          accountId: id,
          kind: type.id,
          amount: parsed.data.amount,
          note: adminAwardNote(parsed.data.note),
        });

        return adminAccountDetailResponse(id, { award: result });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not award that XP." }, { status: 500 });
      }
    },
  });
}
