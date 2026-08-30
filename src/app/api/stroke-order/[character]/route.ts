import { NextResponse } from "next/server";

import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/apiRateLimit";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getStrokeOrder } from "@/lib/strokeOrder";

export async function GET(request: Request, props: { params: Promise<{ character: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/stroke-order/[character]",
    method: "GET",
    request,
    execute: async () => {
      const clientIp = getClientIp(request);
      const rateLimit = checkRateLimit(`public:strokes:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 240,
      });
      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      const { character } = await props.params;
      const kanji = decodeURIComponent(character ?? "").trim();

      // One character only: this is a lookup, not a search.
      if ([...kanji].length !== 1) {
        return NextResponse.json({ error: "Ask for a single character." }, { status: 400 });
      }

      const gradeParam = Number(new URL(request.url).searchParams.get("grade") ?? "");
      const payload = getStrokeOrder(kanji, Number.isFinite(gradeParam) ? gradeParam : undefined);
      if (!payload) {
        return NextResponse.json({ error: "No stroke data for that character." }, { status: 404 });
      }

      const response = NextResponse.json(payload, {
        // Stroke order does not change, so this is safe to keep for a long time.
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      });
      applyRateLimitHeaders(response, rateLimit);
      return response;
    },
  });
}
