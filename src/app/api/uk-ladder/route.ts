import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { SUBJECT_TYPE_VALUES } from "@/lib/domainConstants";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { loadLadderCrosswalk } from "@/lib/ladder/ladderCrosswalkServer";
import { groupLadderByLevel, LADDER_LEVELS_PER_PAGE, queryLadder } from "@/lib/ladder/ladderQuery";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  search: z.string().max(80).default(""),
  kind: z.enum(SUBJECT_TYPE_VALUES as [string, ...string[]]).nullish(),
  nLevel: z.coerce.number().int().min(1).max(5).nullish(),
  level: z.coerce.number().int().min(1).max(KANJI_LADDER_LEVELS).nullish(),
  view: z.enum(["levels", "rows"]).default("levels"),
});

/**
 * The UmaKuma curriculum, open to anyone.
 *
 * The admin route beside this one is the same data behind an admin key, and it
 * stays that way because it will grow editing. This one is deliberately
 * ungated: the ladder is what the site teaches, and a learner deciding whether
 * to start here should be able to read all hundred levels without an account,
 * the same way they can read the JLPT lists and WaniKani's own level pages.
 *
 * Nothing here is per-member. A member's own progress over these items is a
 * different question and a different route — this one answers "what does
 * UmaKuma teach, and when", which has one answer for everybody.
 */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/uk-ladder",
    method: "GET",
    request,
    execute: async () => {
      try {
        const url = new URL(request.url);
        const raw = Object.fromEntries(
          [...url.searchParams.entries()].filter(([, value]) => value !== ""),
        );
        const parsed = querySchema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const { rows, levels } = await loadLadderCrosswalk();
        /* Public and identical for everybody, so it may sit in a shared cache
           rather than a private one — the ladder changes when a script runs,
           not when somebody looks at it. */
        const headers = { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" };

        if (parsed.data.view === "levels" && !parsed.data.search && !parsed.data.kind && !parsed.data.nLevel) {
          const page = parsed.data.level
            ? Math.floor((parsed.data.level - 1) / LADDER_LEVELS_PER_PAGE) + 1
            : parsed.data.page;
          const grouped = groupLadderByLevel(rows, KANJI_LADDER_LEVELS, page);
          return NextResponse.json({ ...grouped, levels, ladderLevels: KANJI_LADDER_LEVELS }, { headers });
        }

        const result = queryLadder(rows, {
          page: parsed.data.page,
          pageSize: 100,
          search: parsed.data.search,
          kind: (parsed.data.kind ?? null) as never,
          source: null as never,
          band: null as never,
          nLevel: parsed.data.nLevel ?? null,
          ukLevelMin: parsed.data.level ?? null,
          ukLevelMax: parsed.data.level ?? null,
          onlyMissingFromWanikani: false,
        });
        return NextResponse.json({ ...result, levels, ladderLevels: KANJI_LADDER_LEVELS }, { headers });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read the curriculum." }, { status: 500 });
      }
    },
  });
}
