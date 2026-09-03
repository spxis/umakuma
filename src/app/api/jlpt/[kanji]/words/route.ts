import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { authOptions } from "@/lib/auth";
import { parseJlptWordExamples } from "@/lib/jlptWordExamples";
import { prisma } from "@/lib/prisma";

/**
 * One kanji's compounds, for the panel that is open.
 *
 * The JLPT explorer used to receive every kanji's word examples with the page:
 * 9.8MB of a 10.5MB payload, all 2,211 rows, so that whichever one the member
 * clicked could show its words. They are read one kanji at a time, so they are
 * fetched one kanji at a time.
 *
 * Signed-in members only, matching the sibling catalogue route: same table,
 * same content, and no reason for one to be reachable without the other.
 */
export async function GET(request: Request, context: { params: Promise<{ kanji: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/jlpt/[kanji]/words",
    method: "GET",
    request,
    execute: async () => {
      try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { kanji } = await context.params;
        const character = decodeURIComponent(kanji);
        /*
         * One character. The column is the primary key, so anything longer is
         * a lookup that cannot match - refused rather than sent to Postgres.
         */
        if ([...character].length !== 1) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const row = await prisma.jlptKanji.findUnique({
          where: { kanji: character },
          select: { wordExamples: true },
        });
        if (!row) {
          return NextResponse.json({ error: "No such kanji." }, { status: 404 });
        }

        return NextResponse.json(
          { words: parseJlptWordExamples(row.wordExamples) },
          {
            status: 200,
            /*
             * The compounds change only when an enrichment script runs, and
             * never per member. A member reading down a list revisits the same
             * kanji often enough for this to matter.
             */
            headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=3600" },
          },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load the words." }, { status: 500 });
      }
    },
  });
}
