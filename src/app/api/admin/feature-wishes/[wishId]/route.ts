import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { FEATURE_WISH_STATUS_VALUES, type FeatureWishStatus } from "@/lib/featureWishes";
import { setFeatureWishStatus } from "@/lib/featureWishesServer";

/**
 * Declining a wish, and changing its mind again.
 *
 * There is no delete. A wish list that forgets what was answered no gets asked
 * the same thing again, which is the whole reason the timeline keeps cancelled
 * work on the record rather than removing it.
 */
const statusSchema = z.object({
  status: z.enum(FEATURE_WISH_STATUS_VALUES as [string, ...string[]]),
});

export async function PATCH(request: Request, context: { params: Promise<{ wishId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/admin/feature-wishes/[wishId]",
    method: "PATCH",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = statusSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const { wishId } = await context.params;
      const wish = await setFeatureWishStatus(wishId, parsed.data.status as FeatureWishStatus);
      if (!wish) {
        return NextResponse.json({ error: "No such wish." }, { status: 404 });
      }

      return NextResponse.json({ wish });
    },
  });
}
