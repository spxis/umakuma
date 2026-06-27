import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
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

        return NextResponse.json(
          { subject },
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
