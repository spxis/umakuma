import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isSourceKey } from "@/lib/sourceCredits";
import { clearSourceReportCache } from "@/lib/sourceReportCache";
import { SHOWCASE_MAX_ROWS } from "@/lib/sourceShowcase";
import { loadShowcase, saveShowcase } from "@/lib/sourceShowcaseServer";

const rowSchema = z.object({
  specimen: z.string().min(1).max(200),
  detail: z.string().min(1).max(300),
  note: z.string().max(400).optional(),
});

const bodySchema = z.object({ rows: z.array(rowSchema).max(SHOWCASE_MAX_ROWS) });

/** What the public page is showing for this source right now. */
export async function GET(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  return withApiRouteTelemetry({
    route: "/api/admin/sources/[source]/showcase",
    method: "GET",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      if (!isSourceKey(source)) {
        return NextResponse.json({ error: "No source is recorded under that name." }, { status: 404 });
      }
      return NextResponse.json({ rows: await loadShowcase(source) });
    },
  });
}

/**
 * Replace a source's picks, or clear them back to the chosen defaults.
 *
 * An empty list is a deliberate reset rather than an error: it removes the
 * stored row, so "no override" has one representation. The report cache is
 * cleared alongside, because an admin who has just saved should see their own
 * pick on the public page rather than the previous one for ten more minutes.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  return withApiRouteTelemetry({
    route: "/api/admin/sources/[source]/showcase",
    method: "PUT",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        if (!isSourceKey(source)) {
          return NextResponse.json({ error: "No source is recorded under that name." }, { status: 404 });
        }

        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        await saveShowcase(source, parsed.data.rows);
        clearSourceReportCache(source);
        return NextResponse.json({ rows: await loadShowcase(source) });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not save the picks." }, { status: 500 });
      }
    },
  });
}
