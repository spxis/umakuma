import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { normalizeDisplayName } from "@/lib/accountIdentity";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  JLPT_CERTIFICATION_STATUS_VALUES,
  isJlptCertificationStatus,
  validateJlptCertification,
} from "@/lib/jlptCertification";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  displayName: z.string().max(200).nullable().optional(),
  jlptStatus: z.string().max(32).nullable().optional(),
  jlptYear: z.coerce.number().int().min(1980).max(2100).nullable().optional(),
  jlptLevel: z.coerce.number().int().min(1).max(5).nullable().optional(),
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

      const { displayName, jlptStatus, jlptYear, jlptLevel } = parsed.data;
      const data: Record<string, unknown> = {};

      if (displayName !== undefined) {
        data.displayName = normalizeDisplayName(displayName);
      }

      if (jlptStatus !== undefined) {
        if (jlptStatus !== null && !isJlptCertificationStatus(jlptStatus)) {
          return NextResponse.json(
            { error: `Status must be one of: ${JLPT_CERTIFICATION_STATUS_VALUES.join(", ")}.` },
            { status: 400 },
          );
        }

        /*
         * The year decides the system, not the member: the test was
         * restructured in 2010 and both schemes count down, so an old Level 4
         * is the beginner certificate. Validating here keeps an impossible
         * pairing - a 2005 sitting at N3, which did not exist - out of the row.
         */
        const validation = validateJlptCertification(
          { status: jlptStatus ?? "none", year: jlptYear ?? null, level: jlptLevel ?? null },
          new Date().getUTCFullYear(),
        );
        if (!validation.ok) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        data.jlptStatus = jlptStatus;
        data.jlptSystem = validation.system;
        data.jlptYear = validation.year;
        data.jlptLevel = validation.level;
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
      }

      const account = await prisma.account.update({
        where: { id },
        data,
        select: { displayName: true, jlptStatus: true, jlptSystem: true, jlptYear: true, jlptLevel: true },
      });

      return NextResponse.json(account);
    },
  });
}
