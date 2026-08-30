import { NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 120 },
): RateLimitResult {
  const now = Date.now();
  cleanupStaleEntries(now);

  const existing = rateLimitStore.get(key);

  if (!existing || now >= existing.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, config.maxRequests - existing.count);
  const resetSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
  const allowed = existing.count <= config.maxRequests;

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetSeconds,
  };
}

export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetSeconds));
  return response;
}

export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const response = NextResponse.json(
    {
      error: "Too Many Requests",
      message: `Rate limit exceeded. Please retry in ${result.resetSeconds} seconds.`,
    },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(result.resetSeconds));
  return applyRateLimitHeaders(response, result);
}
