import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { liveListByKey } from "@/lib/liveLists";
import { subscribe, subscribeLive, unsubscribe, unsubscribeLive, viewableList } from "@/lib/studyListShares";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const bodySchema = z.union([
  z.object({ listId: z.string().min(1), key: z.string().max(64).nullable().optional() }),
  z.object({ liveKey: z.string().min(1).max(64) }),
]);

/**
 * Follow a list you are viewing, or stop.
 *
 * A subscription is a pointer to somebody else's list, kept current and
 * read-only. Making one needs the same permission as opening the list;
 * dropping one needs only to be yours.
 */
export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/subscriptions",
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
        if ("liveKey" in parsed.data) {
          const live = liveListByKey(parsed.data.liveKey);
          if (!live) return NextResponse.json({ error: "That list is gone." }, { status: 404 });
          await subscribeLive(live.key, accountId);
          return NextResponse.json({ subscribed: true });
        }
        const list = await viewableList(parsed.data.listId, accountId, parsed.data.key ?? null, await isAuthorizedAdmin(request));
        if (!list) {
          return NextResponse.json({ error: "That list is gone." }, { status: 404 });
        }
        if (list.accountId === accountId) {
          return NextResponse.json({ error: "It is already your list." }, { status: 409 });
        }
        await subscribe(list.id, accountId);
        return NextResponse.json({ subscribed: true });
      } catch (error) {
        console.error("Failed to follow a list", error);
        return NextResponse.json({ error: "Could not follow that list." }, { status: 500 });
      }
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/subscriptions",
    method: "DELETE",
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
        if ("liveKey" in parsed.data) await unsubscribeLive(parsed.data.liveKey, accountId);
        else await unsubscribe(parsed.data.listId, accountId);
        return NextResponse.json({ subscribed: false });
      } catch (error) {
        console.error("Failed to unfollow a list", error);
        return NextResponse.json({ error: "Could not unfollow that list." }, { status: 500 });
      }
    },
  });
}
