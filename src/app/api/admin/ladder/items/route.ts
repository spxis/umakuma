import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { KANJI_GRADE_BAND_VALUES } from "@/lib/kanjiCoverage";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { SUBJECT_TYPE_VALUES } from "@/lib/domainConstants";
import { LADDER_SOURCE_VALUES } from "@/lib/ladder/ladderCrosswalk";
import { loadLadderCrosswalk } from "@/lib/ladder/ladderCrosswalkServer";
import { LADDER_DEFAULT_PAGE_SIZE, LADDER_PAGE_SIZES, queryLadder } from "@/lib/ladder/ladderQuery";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().refine((value) => (LADDER_PAGE_SIZES as readonly number[]).includes(value)).default(LADDER_DEFAULT_PAGE_SIZE),
  search: z.string().max(80).default(""),
  kind: z.enum(SUBJECT_TYPE_VALUES as [string, ...string[]]).nullish(),
  source: z.enum(LADDER_SOURCE_VALUES as [string, ...string[]]).nullish(),
  band: z.enum(KANJI_GRADE_BAND_VALUES as [string, ...string[]]).nullish(),
  nLevel: z.coerce.number().int().min(1).max(5).nullish(),
  ukLevelMin: z.coerce.number().int().min(1).max(KANJI_LADDER_LEVELS).nullish(),
  ukLevelMax: z.coerce.number().int().min(1).max(KANJI_LADDER_LEVELS).nullish(),
  missingFromWanikani: z.enum(["1", "0"]).nullish(),
});

/**
 * The ladder beside every other scale, searched and paged.
 *
 * Read-only, and deliberately so for now: this release is the measurement
 * surface the ladder has never had. Changing it comes next, and wants an
 * override log behind it rather than a column update.
 */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/ladder/items",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const url = new URL(request.url);
        const raw = Object.fromEntries(
          [...url.searchParams.entries()].filter(([, value]) => value !== ""),
        );
        const parsed = querySchema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const { rows, levels } = await loadLadderCrosswalk();
        const result = queryLadder(rows, {
          page: parsed.data.page,
          pageSize: parsed.data.pageSize,
          search: parsed.data.search,
          kind: (parsed.data.kind ?? null) as never,
          source: (parsed.data.source ?? null) as never,
          band: (parsed.data.band ?? null) as never,
          nLevel: parsed.data.nLevel ?? null,
          ukLevelMin: parsed.data.ukLevelMin ?? null,
          ukLevelMax: parsed.data.ukLevelMax ?? null,
          onlyMissingFromWanikani: parsed.data.missingFromWanikani === "1",
        });

        return NextResponse.json(
          { ...result, levels, ladderLevels: KANJI_LADDER_LEVELS },
          { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" } },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read the ladder." }, { status: 500 });
      }
    },
  });
}
