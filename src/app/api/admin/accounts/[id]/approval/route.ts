import { NextResponse } from "next/server";
import { z } from "zod";

import { ACCOUNT_APPROVAL, isAccountApproval } from "@/lib/accountApproval";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  approvalStatus: z.string().max(16),
});

/**
 * Let a member in, or turn them away.
 *
 * Approving stamps the time, which is the only record of when someone was let
 * in; rejecting clears it, so a member approved and later rejected does not
 * keep a stamp that says otherwise.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]/approval",
    method: "PATCH",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const { id } = await context.params;
      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success || !isAccountApproval(parsed.data.approvalStatus)) {
        return NextResponse.json({ error: "Invalid approval status." }, { status: 400 });
      }

      const approvalStatus = parsed.data.approvalStatus;
      const account = await prisma.account.update({
        where: { id },
        data: {
          approvalStatus,
          approvedAt: approvalStatus === ACCOUNT_APPROVAL.approved ? new Date() : null,
        },
        select: { id: true, slug: true, displayName: true, approvalStatus: true, approvedAt: true },
      });

      return NextResponse.json({ account });
    },
  });
}
