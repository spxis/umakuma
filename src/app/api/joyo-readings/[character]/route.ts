import { NextResponse } from "next/server";

import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/apiRateLimit";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getJoyoReadings, joyoAttribution } from "@/lib/joyoReadings";

export async function GET(request: Request, props: { params: Promise<{ character: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/joyo-readings/[character]",
    method: "GET",
    request,
    execute: async () => {
      const clientIp = getClientIp(request);
      const rateLimit = checkRateLimit(`public:joyo:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 240,
      });
      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      const { character } = await props.params;
      const kanji = decodeURIComponent(character ?? "").trim();
      if ([...kanji].length !== 1) {
        return NextResponse.json({ error: "Ask for a single character." }, { status: 400 });
      }

      const entry = getJoyoReadings(kanji);
      if (!entry) {
        // Outside the joyo table - a name kanji, or not a kanji at all.
        return NextResponse.json({ error: "Not in the joyo table." }, { status: 404 });
      }

      const response = NextResponse.json(
        { ...entry, attribution: joyoAttribution() },
        // The table is a cabinet notification; it changes about once a decade.
        { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
      );
      applyRateLimitHeaders(response, rateLimit);
      return response;
    },
  });
}
