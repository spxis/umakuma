import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { MAP_MARK_STATUS_VALUES } from "@/lib/mapMarks";
import { loadMapMarks, saveMapMark } from "@/lib/mapMarksServer";

type RouteContext = { params: Promise<{ accountId: string }> };

/**
 * What one member has said about a map's regions.
 *
 * Under `/api/maps` rather than `/api/study`: a mark is about a place, not
 * about a WaniKani subject, and the map is its own surface.
 */
const markSchema = z.object({
  country: z.string().min(1).max(8),
  region: z.string().min(1).max(16),
  /** Null clears the status; the row goes when nothing at all is left. */
  status: z.enum(MAP_MARK_STATUS_VALUES as [string, ...string[]]).nullable(),
  visited: z.boolean(),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/maps/[accountId]/marks",
    method: "GET",
    request,
    execute: async () => {
      const { accountId } = await context.params;
      if (!(await canAccessAccount(request, accountId))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      const country = new URL(request.url).searchParams.get("country") ?? "";
      if (!country) return NextResponse.json({ error: "Which map?" }, { status: 400 });
      return NextResponse.json({ marks: await loadMapMarks(accountId, country) });
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/maps/[accountId]/marks",
    method: "PATCH",
    request,
    execute: async () => {
      const { accountId } = await context.params;
      if (!(await canAccessAccount(request, accountId))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = markSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const { country, region, status, visited } = parsed.data;
      await saveMapMark({
        accountId,
        country,
        region,
        status: status as (typeof MAP_MARK_STATUS_VALUES)[number] | null,
        visited,
      });
      return NextResponse.json({ mark: { region, status, visited } });
    },
  });
}
