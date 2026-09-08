import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { ourLevelSlot, ukSubjectTypeFor } from "@/lib/uk/ukExplorerFeed";
import { ukUpcoming } from "@/lib/uk/ukStudyQueue";

type RouteContext = { params: Promise<{ accountId: string }> };

const querySchema = z.object({ limit: z.coerce.number().int().positive().max(50).default(8) });

/** The next reviews to fall due, for the explorer's "coming up" strip. */
export async function GET(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/upcoming",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }
        const { items: upcoming, totalUpcoming } = await ukUpcoming(accountId, new Date(), parsed.data.limit);
        const items = upcoming.map((item) => ({
          subjectId: item.subjectId,
          subjectType: ukSubjectTypeFor(item.kind),
          wkLevel: null,
          ...ourLevelSlot(item),
          characters: item.characters,
          primaryMeaning: item.meanings[0] ?? null,
          primaryReading: item.readings[0] ?? null,
          availableAt: item.availableAt.toISOString(),
        }));
        return NextResponse.json({ items, totalUpcoming }, { headers: { "Cache-Control": "private, no-store" } });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read what is coming up." }, { status: 500 });
      }
    },
  });
}
