import { NextResponse } from "next/server";
import { z } from "zod";

import { loadStudyAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  WANIKANI_REQUIRED_MESSAGE,
  WANIKANI_REQUIRED_STATUS,
  wanikaniConnection,
} from "@/lib/wanikaniConnection";
import { clearStudyQueueCache } from "@/lib/studyQueueCache";
import { putWaniKani } from "@/lib/wanikani/http";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const lessonStartSchema = z.object({
  assignmentId: z.number().int().positive(),
});

export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lesson/start",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        /* One read: the access decision and the token come together. */
        const { allowed, account } = await loadStudyAccount(request, accountId);
        if (!allowed) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

    const json = await request.json();
    const parsed = lessonStartSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

        if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const connection = wanikaniConnection(account);
                if (!connection) {
                  return NextResponse.json(
                    { error: WANIKANI_REQUIRED_MESSAGE },
                    { status: WANIKANI_REQUIRED_STATUS },
                  );
                }
                const token = connection.token;

    try {
      await putWaniKani(`/assignments/${parsed.data.assignmentId}/start`, token, {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "WaniKani API error";

      // Treat already-started conflicts as handled so study flow can continue.
      if (message.includes("422") || message.includes("409")) {
        clearStudyQueueCache(accountId);
        return NextResponse.json({ ok: true, skipped: true, reason: "already-started-or-unavailable" });
      }

      if (message.includes("429")) {
        return NextResponse.json({ error: "Rate limited by WaniKani. Please retry in a moment." }, { status: 429 });
      }

      return NextResponse.json({ error: message }, { status: 502 });
    }

    clearStudyQueueCache(accountId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
        return NextResponse.json({ error: "Could not start lesson." }, { status: 500 });
      }
    },
  });
}