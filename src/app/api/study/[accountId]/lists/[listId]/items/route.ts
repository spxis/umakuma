import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { isMissingStudyListTableError } from "@/lib/studyListRules";
import { fetchStudyListItems } from "@/lib/studySubjectItems";

type RouteContext = {
  params: Promise<{ accountId: string; listId: string }>;
};

/**
 * What a saved list actually holds.
 *
 * A list card showed a wall of glyphs and offered rename, edit, delete and
 * practise - so the one thing a member could not do with a list they had built
 * was read it. The Trouble and Favourites lists had a viewer from the start;
 * this is the same viewer's data for a list with a name instead of a flag.
 *
 * Addressed by list id and scoped to the account in the same `where`, so a list
 * id from another member reads as a missing list rather than as somebody else's
 * contents.
 */
export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/[listId]/items",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId, listId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const list = await prisma.studyList
          .findFirst({
            where: { id: listId, accountId },
            select: { name: true, items: { select: { kind: true, key: true, subjectId: true }, orderBy: { position: "asc" } } },
          })
          .catch((error: unknown) => {
            if (isMissingStudyListTableError(error)) return null;
            throw error;
          });

        if (!list) {
          return NextResponse.json({ error: "That list is gone." }, { status: 404 });
        }

        return NextResponse.json(
          { name: list.name, items: await fetchStudyListItems(accountId, list.items) },
          { status: 200 },
        );
      } catch (error) {
        console.error("Failed to load a saved list", error);
        return NextResponse.json({ error: "Could not load that list." }, { status: 500 });
      }
    },
  });
}
