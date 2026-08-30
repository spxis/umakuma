import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isFeatureFlagKey } from "@/lib/featureFlags";
import { loadFeatureFlagStates, setFeatureFlag } from "@/lib/featureFlagsServer";

const toggleSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/feature-flags",
    method: "GET",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      return NextResponse.json({ flags: await loadFeatureFlagStates() });
    },
  });
}

export async function PUT(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/feature-flags",
    method: "PUT",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      if (!isFeatureFlagKey(parsed.data.key)) {
        return NextResponse.json({ error: "Unknown flag." }, { status: 400 });
      }

      await setFeatureFlag(parsed.data.key, parsed.data.enabled);
      return NextResponse.json({ flags: await loadFeatureFlagStates() });
    },
  });
}
