import { NextResponse } from "next/server";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { deleteLadderOp } from "@/lib/ladder/ladderOpsServer";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Withdraws an edit, while it is still ours to withdraw.
 *
 * Once exported it is in the committed file and the build replays it from
 * there; deleting the row then would leave the two disagreeing with nothing to
 * say which was right. So an exported op is a 409, not a delete.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/admin/ladder/ops/[id]",
    method: "DELETE",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const removed = await deleteLadderOp(id);
        if (!removed) {
          return NextResponse.json(
            { error: "That edit has already been exported into the committed ladder." },
            { status: 409 },
          );
        }
        return NextResponse.json({ removed: true });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not withdraw that edit." }, { status: 500 });
      }
    },
  });
}
