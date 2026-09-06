import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { ukSubjectTypeFor } from "@/lib/uk/ukExplorerFeed";

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
        const now = new Date();
        const where = { accountId, availableAt: { gt: now }, burnedAt: null };
        const [totalUpcoming, states] = await Promise.all([
          prisma.ukSrsState.count({ where }),
          prisma.ukSrsState.findMany({
            where,
            select: {
              availableAt: true,
              subject: { select: { id: true, kind: true, level: true, characters: true, meanings: true, readings: true } },
            },
            orderBy: [{ availableAt: "asc" }, { id: "asc" }],
            take: parsed.data.limit,
          }),
        ]);
        const items = states.map((row) => ({
          subjectId: row.subject.id,
          subjectType: ukSubjectTypeFor(row.subject.kind),
          wkLevel: null,
          unLevel: row.subject.level,
          characters: row.subject.characters,
          primaryMeaning: row.subject.meanings[0] ?? null,
          primaryReading: row.subject.readings[0] ?? null,
          availableAt: row.availableAt!.toISOString(),
        }));
        return NextResponse.json({ items, totalUpcoming }, { headers: { "Cache-Control": "private, no-store" } });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read what is coming up." }, { status: 500 });
      }
    },
  });
}
