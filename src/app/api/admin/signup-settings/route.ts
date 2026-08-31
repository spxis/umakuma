import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isSignupSettingKey, isValidSettingValue } from "@/lib/signupSettings";
import { loadSignupSettings, saveSignupSetting } from "@/lib/signupSettingsServer";

const bodySchema = z.object({
  key: z.string().max(64),
  value: z.string().max(64),
});

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/signup-settings",
    method: "GET",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      return NextResponse.json({ settings: await loadSignupSettings() });
    },
  });
}

export async function PATCH(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/signup-settings",
    method: "PATCH",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const { key, value } = parsed.data;
      if (!isSignupSettingKey(key)) {
        return NextResponse.json({ error: "Unknown setting." }, { status: 400 });
      }

      /*
       * Each setting accepts a different set of values, so validate against
       * the one being written rather than a shared allow-list. Otherwise a
       * visibility value would be accepted as a signup mode.
       */
      if (!isValidSettingValue(key, value)) {
        return NextResponse.json({ error: "That value is not allowed for this setting." }, { status: 400 });
      }

      await saveSignupSetting(key, value);
      return NextResponse.json({ settings: await loadSignupSettings() });
    },
  });
}
