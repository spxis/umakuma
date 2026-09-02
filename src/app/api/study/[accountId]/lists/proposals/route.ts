import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { LIST_CONTRIBUTION_VALUES } from "@/lib/listContributions";
import { decideProposal, setContributions } from "@/lib/studyListContributions";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

/*
 * Two owner decisions in one route: settle a proposal, or open and lock the
 * list. Both are the owner's alone, so both sit under the owner's account.
 */
const bodySchema = z.union([
  z.object({ proposalId: z.string().min(1), decision: z.enum(["approved", "declined"]) }),
  z.object({ listId: z.string().min(1), contributions: z.enum(LIST_CONTRIBUTION_VALUES) }),
]);

export async function PATCH(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/proposals",
    method: "PATCH",
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
        const done =
          "proposalId" in parsed.data
            ? await decideProposal(accountId, parsed.data.proposalId, parsed.data.decision)
            : await setContributions(accountId, parsed.data.listId, parsed.data.contributions);
        if (!done) {
          return NextResponse.json({ error: "Nothing to decide." }, { status: 404 });
        }
        return NextResponse.json({ ok: true });
      } catch (error) {
        console.error("Failed to decide on a list", error);
        return NextResponse.json({ error: "Could not change that list." }, { status: 500 });
      }
    },
  });
}
