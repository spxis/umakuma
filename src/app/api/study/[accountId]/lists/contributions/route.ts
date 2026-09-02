import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { LIST_ITEM_KIND_VALUES } from "@/lib/domainConstants";
import { STUDY_LIST_LIMITS } from "@/lib/studyListRules";
import { contribute } from "@/lib/studyListContributions";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const itemSchema = z.object({
  kind: z.enum(LIST_ITEM_KIND_VALUES),
  key: z.string().min(1).max(200),
  subjectId: z.number().int().positive().nullable().optional(),
});

const bodySchema = z.object({
  listId: z.string().min(1),
  key: z.string().max(64).nullable().optional(),
  additions: z.array(itemSchema).max(STUDY_LIST_LIMITS.items).default([]),
  removal: itemSchema.nullable().optional(),
  note: z.string().max(STUDY_LIST_LIMITS.noteLength * 2).nullable().optional(),
});

/**
 * A member offers changes to somebody else's list.
 *
 * The member's own account is the address; the list is in the body with the
 * key if it is unlisted. Whether the change lands or waits is the list's
 * rule, not the caller's: an open list takes additions at once, a locked one
 * turns them into proposals, and a removal is always a proposal.
 */
export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/contributions",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }
        const note = parsed.data.note?.replace(/\s+/g, " ").trim() || null;
        const outcome = await contribute({
          listId: parsed.data.listId,
          viewerAccountId: accountId,
          key: parsed.data.key ?? null,
          isAdmin: await isAuthorizedAdmin(request),
          additions: parsed.data.additions,
          removal: parsed.data.removal ?? null,
          note: note ? Array.from(note).slice(0, STUDY_LIST_LIMITS.noteLength).join("") : null,
        });
        if (!outcome) {
          return NextResponse.json({ error: "That list is gone." }, { status: 404 });
        }
        return NextResponse.json(outcome);
      } catch (error) {
        console.error("Failed to contribute to a list", error);
        return NextResponse.json({ error: "Could not change that list." }, { status: 500 });
      }
    },
  });
}
