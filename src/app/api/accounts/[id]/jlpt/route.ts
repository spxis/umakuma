import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { toCertificates, validateCertificate } from "@/lib/jlptCertificates";
import { JLPT_CERTIFICATION_STATUSES, JLPT_FIRST_YEAR } from "@/lib/jlptCertification";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  year: z.coerce.number().int().nullable(),
  level: z.coerce.number().int().nullable(),
});

async function certificatesFor(accountId: string) {
  const rows = await prisma.jlptCertificate.findMany({
    where: { accountId },
    select: { id: true, system: true, level: true, year: true },
  });
  return toCertificates(rows);
}

/** Every certificate this member reports holding, hardest first. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/jlpt",
    method: "GET",
    request,
    execute: async () => {
      const { id } = await context.params;
      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      return NextResponse.json({ certificates: await certificatesFor(id) });
    },
  });
}

/**
 * Add one certificate.
 *
 * The same level in the same year is the same certificate, so a second attempt
 * at it is quietly the first one rather than a duplicate or an error - the
 * member asked for a state, not for an insert. Holding any certificate also
 * settles the status: somebody who has passed is not still planning to.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/jlpt",
    method: "POST",
    request,
    execute: async () => {
      const { id } = await context.params;
      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const checked = validateCertificate(parsed.data, new Date().getUTCFullYear(), JLPT_FIRST_YEAR);
      if (!checked.ok) {
        return NextResponse.json({ error: checked.error }, { status: 400 });
      }

      const { system, level, year } = checked.certificate;
      await prisma.jlptCertificate.upsert({
        where: { accountId_system_level_year: { accountId: id, system, level, year } },
        create: { accountId: id, system, level, year },
        update: {},
      });
      await prisma.account.update({
        where: { id },
        data: { jlptStatus: JLPT_CERTIFICATION_STATUSES.passed },
      });

      return NextResponse.json({ certificates: await certificatesFor(id) });
    },
  });
}
