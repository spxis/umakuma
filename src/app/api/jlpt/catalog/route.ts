import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { authOptions } from "@/lib/auth";
import { toCatalogQuery } from "@/lib/jlptCatalogQuery";
import { fetchJlptStudyPage } from "@/lib/jlptStudyCatalog";

/**
 * JLPT kanji for any signed-in member, with or without WaniKani.
 *
 * The sibling admin route reads the same table and has never referenced
 * WaniKani, but it is gated on `isAuthorizedAdmin`; the member-facing JLPT
 * surfaces went through `/api/accounts/[id]/jlpt`, which decrypts the account's
 * WaniKani token to overlay SRS state and so needs one to exist. A member who
 * signed in with Google and never connected WaniKani could therefore not read
 * a table that has nothing to do with WaniKani.
 *
 * This route serves the content and nothing else. No token, no account lookup,
 * no SRS overlay - a member who wants their own progress on top still asks the
 * account route for it, and one who has no WaniKani account gets the kanji.
 */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/jlpt/catalog",
    method: "GET",
    request,
    execute: async () => {
      try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const query = toCatalogQuery(new URL(request.url));
        if (!query) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        return NextResponse.json(await fetchJlptStudyPage(query), {
          status: 200,
          /*
           * The catalogue changes when an enrichment script runs, which is
           * rarely and never per member. Long enough to spare the database a
           * query per page of browsing, short enough that a refresh shows up.
           */
          headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load JLPT kanji." }, { status: 500 });
      }
    },
  });
}
