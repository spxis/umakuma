import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { normalizeDisplayName } from "@/lib/accountIdentity";
import { ACCOUNT_VISIBILITY_VALUES, isAccountVisibility } from "@/lib/accountVisibility";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { JLPT_CERTIFICATION_STATUS_VALUES, isJlptCertificationStatus } from "@/lib/jlptCertification";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  displayName: z.string().max(200).nullable().optional(),
  visibility: z.string().max(16).optional(),
  jlptStatus: z.string().max(32).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/profile",
    method: "PATCH",
    request,
    execute: async () => {
      const { id } = await context.params;

      // Only the owner edits their own profile.
      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const { displayName, visibility, jlptStatus } = parsed.data;
      const data: Record<string, unknown> = {};

      if (displayName !== undefined) {
        data.displayName = normalizeDisplayName(displayName);
      }

      if (visibility !== undefined) {
        if (!isAccountVisibility(visibility)) {
          return NextResponse.json(
            { error: `Visibility must be one of: ${ACCOUNT_VISIBILITY_VALUES.join(", ")}.` },
            { status: 400 },
          );
        }
        data.visibility = visibility;
      }

      if (jlptStatus !== undefined) {
        if (jlptStatus !== null && !isJlptCertificationStatus(jlptStatus)) {
          return NextResponse.json(
            { error: `Status must be one of: ${JLPT_CERTIFICATION_STATUS_VALUES.join(", ")}.` },
            { status: 400 },
          );
        }

        /*
         * The status is the member's relationship with the test - planning to
         * sit one, none, rather not say. What they have actually
         * passed is a certificate, and a member may hold several, so it is a
         * row through `/api/accounts/[id]/jlpt` rather than a level here that
         * the next pass would overwrite.
         */
        data.jlptStatus = jlptStatus;
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
      }

      const account = await prisma.account.update({
        where: { id },
        data,
        select: { displayName: true, visibility: true, jlptStatus: true },
      });

      return NextResponse.json(account);
    },
  });
}
