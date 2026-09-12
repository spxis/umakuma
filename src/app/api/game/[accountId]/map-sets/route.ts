import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { MAP_SET_LIMITS, MAP_SET_VISIBILITY_VALUES } from "@/lib/mapCustomSets";
import { createMapSet, listMapSetsFor } from "@/lib/mapCustomSetsServer";

/**
 * A member's custom Map sets: read them all, or save one.
 *
 * No edit and no delete yet, by decision: a set is a handful of codes and a
 * name, and remaking one costs a minute. Both can come when somebody asks.
 */
const draftSchema = z.object({
  country: z.string().min(2).max(2),
  name: z.string().max(MAP_SET_LIMITS.name * 4),
  regions: z.array(z.union([z.string().max(8), z.number().int()])).max(200),
  /* Site is an admin's word; the rules refuse it from anybody else. */
  visibility: z.enum(MAP_SET_VISIBILITY_VALUES as [string, ...string[]]).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ accountId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/map-sets",
    method: "GET",
    request,
    execute: async () => {
      const { accountId } = await context.params;
      if (!(await canAccessAccount(request, accountId))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      return NextResponse.json({ sets: await listMapSetsFor(accountId) });
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ accountId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/map-sets",
    method: "POST",
    request,
    execute: async () => {
      const { accountId } = await context.params;
      if (!(await canAccessAccount(request, accountId))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      const parsed = draftSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }
      /* The rules say what a usable set is; this route repeats none of them. */
      const outcome = await createMapSet(accountId, parsed.data as Parameters<typeof createMapSet>[1], await isAuthorizedAdmin(request));
      if (!outcome.ok) {
        return NextResponse.json({ error: outcome.problems[0], problems: outcome.problems }, { status: 422 });
      }
      return NextResponse.json({ set: outcome.set }, { status: 201 });
    },
  });
}
