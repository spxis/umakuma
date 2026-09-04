import { NextResponse } from "next/server";
import { z } from "zod";

import { adminEmail, isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { pendingLadderOps, recordLadderOp } from "@/lib/ladder/ladderOpsServer";

const bodySchema = z.object({
  op: z.enum(["move", "add", "remove"]),
  key: z.string().trim().min(3).max(80),
  toLevel: z.coerce.number().int().min(1).max(KANJI_LADDER_LEVELS).nullish(),
  reason: z.string().trim().max(500).nullish(),
});

/** What has been changed but not yet written into the committed ladder. */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/ladder/ops",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        return NextResponse.json({ ops: await pendingLadderOps() });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read the pending edits." }, { status: 500 });
      }
    },
  });
}

/**
 * Moves, adds or removes a kanji.
 *
 * Refuses rather than guesses, and names what it refused: an op that would
 * empty a level, overfill one, or take a kanji outside the levels its JLPT
 * band is taught in comes back 409 with the reason. The same function decides
 * this as decides it at build time, so an op accepted here is one the next
 * rebuild will also accept.
 */
export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/ladder/ops",
    method: "POST",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const result = await recordLadderOp({
          input: parsed.data,
          by: (await adminEmail(request)) ?? "admin",
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.refusal.reason, key: result.refusal.key }, { status: 409 });
        }
        return NextResponse.json(result);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not record that edit." }, { status: 500 });
      }
    },
  });
}
