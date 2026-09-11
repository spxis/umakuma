import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/apiRateLimit";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { authOptions } from "@/lib/auth";
import { FEATURE_AREA_VALUES, FEATURE_KINDS, FEATURE_KIND_VALUES } from "@/lib/featureTimeline";
import { TICKET_LIMITS, ticketDraftProblems } from "@/lib/tickets";
import { ADMIN_TICKETS_RATE_LIMIT } from "@/lib/ticketsApi";
import { createTicket, listTickets } from "@/lib/ticketsServer";

/**
 * The one write path into the wish list.
 *
 * The release timeline itself has no API and will not get one: it is a file in
 * the repository, and a running server cannot commit. A wish is the part that
 * can be typed on the site, so this is where it lands.
 */
/*
 * Zod keeps a megabyte out; `ticketDraftProblems` says what a usable ticket
 * is, in the words the form and the CLI also use. Two gates, two jobs.
 */
const wishSchema = z.object({
  title: z.string().trim().max(TICKET_LIMITS.title * 4),
  detail: z.string().trim().max(TICKET_LIMITS.detail * 4).optional(),
  area: z.enum(FEATURE_AREA_VALUES as [string, ...string[]]).optional(),
  kind: z.enum(FEATURE_KIND_VALUES as [string, ...string[]]).optional(),
});

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/tickets",
    method: "GET",
    request,
    execute: async () => {
      const limit = checkRateLimit(`admin-tickets:${getClientIp(request)}`, ADMIN_TICKETS_RATE_LIMIT);
      if (!limit.allowed) return createRateLimitResponse(limit);

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
      const limit = checkRateLimit(`admin-tickets:${getClientIp(request)}`, ADMIN_TICKETS_RATE_LIMIT);
      if (!limit.allowed) return createRateLimitResponse(limit);

      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = wishSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const session = await getServerSession(authOptions);
      const draft = {
        title: parsed.data.title,
        detail: parsed.data.detail?.trim() || null,
        requestedBy: session?.user?.email?.trim().toLowerCase() ?? null,
      };
      /* The board's own rules say what a usable ticket is; this route repeats none of them. */
      const problems = ticketDraftProblems(draft);
      if (problems.length > 0) {
        return NextResponse.json({ error: problems[0], problems }, { status: 422 });
      }

      const wish = await createTicket({
        ...draft,
        area: (parsed.data.area as never) ?? null,
        kind: (parsed.data.kind as never) ?? FEATURE_KINDS.feature,
      });

      return NextResponse.json({ wish }, { status: 201 });
    },
  });
}
