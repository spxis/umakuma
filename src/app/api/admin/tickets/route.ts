import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { authOptions } from "@/lib/auth";
import { FEATURE_AREA_VALUES, FEATURE_KINDS, FEATURE_KIND_VALUES } from "@/lib/featureTimeline";
import { TICKET_LIMITS } from "@/lib/tickets";
import { createTicket, listTickets } from "@/lib/ticketsServer";

/**
 * The one write path into the wish list.
 *
 * The release timeline itself has no API and will not get one: it is a file in
 * the repository, and a running server cannot commit. A wish is the part that
 * can be typed on the site, so this is where it lands.
 */
const wishSchema = z.object({
  title: z.string().trim().min(1).max(TICKET_LIMITS.title),
  detail: z.string().trim().max(TICKET_LIMITS.detail).optional(),
  area: z.enum(FEATURE_AREA_VALUES as [string, ...string[]]).optional(),
  kind: z.enum(FEATURE_KIND_VALUES as [string, ...string[]]).optional(),
});

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/tickets",
    method: "GET",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      return NextResponse.json({ wishes: await listTickets() });
    },
  });
}

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/tickets",
    method: "POST",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = wishSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const session = await getServerSession(authOptions);
      const wish = await createTicket({
        title: parsed.data.title,
        detail: parsed.data.detail?.trim() || null,
        area: (parsed.data.area as never) ?? null,
        kind: (parsed.data.kind as never) ?? FEATURE_KINDS.feature,
        requestedBy: session?.user?.email?.trim().toLowerCase() ?? null,
      });

      return NextResponse.json({ wish }, { status: 201 });
    },
  });
}
