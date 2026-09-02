import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { toCertificates } from "@/lib/jlptCertificates";
import { JLPT_CERTIFICATION_STATUSES } from "@/lib/jlptCertification";
import { prisma } from "@/lib/prisma";

/**
 * Take one certificate back.
 *
 * Reported by hand, so it can be reported wrongly - a year mistyped, a level
 * confused across the 2010 restructure. Removing the last one leaves the
 * member with no certificate rather than a status still claiming a pass.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string; certificateId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/jlpt/[certificateId]",
    method: "DELETE",
    request,
    execute: async () => {
      const { id, certificateId } = await context.params;
      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      /* Scoped to the account, so somebody else's id deletes nothing. */
      const removed = await prisma.jlptCertificate.deleteMany({ where: { id: certificateId, accountId: id } });
      if (removed.count === 0) {
        return NextResponse.json({ error: "No such certificate." }, { status: 404 });
      }

      const rows = await prisma.jlptCertificate.findMany({
        where: { accountId: id },
        select: { id: true, system: true, level: true, year: true },
      });
      if (rows.length === 0) {
        await prisma.account.update({
          where: { id },
          data: { jlptStatus: JLPT_CERTIFICATION_STATUSES.none },
        });
      }

      return NextResponse.json({ certificates: toCertificates(rows) });
    },
  });
}
