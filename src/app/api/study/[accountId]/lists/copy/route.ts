import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { copyList, viewableList } from "@/lib/studyListShares";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const copySchema = z.object({
  listId: z.string().min(1),
  /** The key from an unlisted link, when that is how the list was reached. */
  key: z.string().max(64).nullable().optional(),
});

/**
 * Copy a list you are viewing onto your own shelf.
 *
 * The member's own account is the address; the source is in the body, with
 * the key if the source is unlisted. May the member open the source is the
 * same question the list's page asks, so a list that cannot be seen cannot
 * be copied either, and a copy of a private list is impossible by construction.
 */
export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/copy",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = copySchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const source = await viewableList(parsed.data.listId, accountId, parsed.data.key ?? null, await isAuthorizedAdmin(request));
        if (!source) {
          return NextResponse.json({ error: "That list is gone." }, { status: 404 });
        }

        const list = await copyList(source, accountId);
        return NextResponse.json({ list });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("as many lists")) {
          return NextResponse.json({ error: message }, { status: 409 });
        }
        console.error("Failed to copy a list", error);
        return NextResponse.json({ error: "Could not copy that list." }, { status: 500 });
      }
    },
  });
}
