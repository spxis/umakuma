import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { confusableWarnings } from "@/lib/kanjiConfusableWarning";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";

type RouteContext = {
  params: Promise<{ id: string; subjectId: string }>;
};

const paramsSchema = z.object({
  id: z.string().trim().min(1),
  subjectId: z.coerce.number().int().positive(),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/subjects/[subjectId]",
    method: "GET",
    request,
    execute: async () => {
      try {
        const rawParams = await context.params;
        const parsedParams = paramsSchema.safeParse(rawParams);
        if (!parsedParams.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const { id, subjectId } = parsedParams.data;

        if (!(await canAccessAccount(request, id))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const details = await getCatalogSubjectDetails([subjectId]);
        const subject = details.get(subjectId);
        if (!subject) {
          return NextResponse.json({ error: "Subject not found." }, { status: 404 });
        }

        /*
         * The look-alike warning is the member's, not the subject's: which
         * twins are worth naming depends on where they are on the ladder. The
         * viewer opens over history and the tagged lists as well as the queue,
         * so it is resolved here rather than only where a review is served.
         */
        const account = await prisma.account.findUnique({
          where: { id },
          select: { wkLevel: true },
        });
        const confusables =
          subject.subjectType === SUBJECT_TYPES.kanji
            ? confusableWarnings(subject.characters ?? "", account?.wkLevel ?? null)
            : [];

        return NextResponse.json(
          { subject: { ...subject, confusables } },
          {
            status: 200,
            headers: {
              "Cache-Control": "private, max-age=900, stale-while-revalidate=3600",
            },
          },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load subject details." }, { status: 500 });
      }
    },
  });
}
