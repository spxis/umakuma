import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { adminAccountDetailResponse } from "@/lib/adminAccountDetail";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { prisma } from "@/lib/prisma";
import { raiseUnLevelFloor } from "@/lib/uk/unLevelServer";

const bodySchema = z.object({
  floor: z.coerce.number().int().min(1).max(KANJI_LADDER_LEVELS),
});

/**
 * Raising a member's level floor, which the schema already names an admin as
 * one of the four things that may do.
 *
 * It goes through `raiseUnLevelFloor` rather than writing the column, because
 * the floor is the only stored input to the level and the level is derived
 * from it: that function re-derives and writes `unLevel` in the same breath,
 * which is the property `syncAccountLevels` exists to keep.
 *
 * It never lowers. A floor is what a placement test or a WaniKani import
 * bought, and taking it back is the one thing that would make either of them
 * not worth sitting - so a request below the current floor is a no-op there
 * rather than a refusal here, and the answer carries the floor that actually
 * stands.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]/level-floor",
    method: "POST",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { id } = await context.params;
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const existing = await prisma.account.findUnique({ where: { id }, select: { unLevelFloor: true } });
        if (!existing) {
          return NextResponse.json({ error: "No such account." }, { status: 404 });
        }

        await raiseUnLevelFloor({ accountId: id, floor: parsed.data.floor, source: "admin" });

        return adminAccountDetailResponse(id);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not raise that level floor." }, { status: 500 });
      }
    },
  });
}
