import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  internal: z.boolean(),
});

/**
 * Make a member internal, or ordinary again.
 *
 * Internal is the family and the people who help run the place: they are the
 * ones the reading challenge is for. It is a flag on the account rather than
 * a role table because there is exactly one thing it decides, and admins are
 * internal by definition without being marked so.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]/internal",
    method: "PATCH",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const { id } = await context.params;
      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const account = await prisma.account.update({
        where: { id },
        data: { internal: parsed.data.internal },
        select: { id: true, nickname: true, internal: true },
      });

      return NextResponse.json({ account });
    },
  });
}
