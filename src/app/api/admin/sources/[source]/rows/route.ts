import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isSourceKey } from "@/lib/sourceCredits";
import { sourceRowsPage } from "@/lib/sourceRows";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  q: z.string().max(80).optional(),
});

/**
 * One page of a source's rows, for the admin picking a showcase.
 *
 * Paged on the server rather than shipped whole: Tatoeba alone is a quarter of
 * a million sentences, and the point of the picker is to look at twenty at a
 * time. Cached briefly at the client's edge because a page of a file that a
 * script writes cannot change between two clicks.
 */
export async function GET(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  return withApiRouteTelemetry({
    route: "/api/admin/sources/[source]/rows",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        if (!isSourceKey(source)) {
          return NextResponse.json({ error: "No source is recorded under that name." }, { status: 404 });
        }

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          page: url.searchParams.get("page") ?? undefined,
          q: url.searchParams.get("q") ?? undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const payload = await sourceRowsPage(source, { page: parsed.data.page, query: parsed.data.q });
        return NextResponse.json(payload, {
          headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" },
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read that source." }, { status: 500 });
      }
    },
  });
}
