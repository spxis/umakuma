import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const INVITE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_INVITE_ATTEMPTS_PER_WINDOW = 12;

type AttemptRow = {
  attempts: number;
};

function getRateLimitSecret(): string {
  const secret = process.env.INVITE_RATE_LIMIT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("INVITE_RATE_LIMIT_SECRET or AUTH_SECRET is required.");
  }
  return secret;
}

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const firstForwarded = forwardedFor.split(",")[0]?.trim();
  return firstForwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function createAttemptKey(request: Request): string {
  return createHmac("sha256", getRateLimitSecret())
    .update(`invite:${getClientIdentifier(request)}`)
    .digest("hex");
}

export async function consumeInviteAttempt(request: Request): Promise<boolean> {
  const key = createAttemptKey(request);
  const resetAt = new Date(Date.now() + INVITE_ATTEMPT_WINDOW_MS);
  const rows = await prisma.$queryRaw<AttemptRow[]>(Prisma.sql`
    INSERT INTO "InviteRateLimit" ("key", "attempts", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "InviteRateLimit"."resetAt" <= NOW() THEN 1
        ELSE "InviteRateLimit"."attempts" + 1
      END,
      "resetAt" = CASE
        WHEN "InviteRateLimit"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "InviteRateLimit"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "attempts"
  `);

  return (rows[0]?.attempts ?? MAX_INVITE_ATTEMPTS_PER_WINDOW + 1)
    > MAX_INVITE_ATTEMPTS_PER_WINDOW;
}

export async function clearInviteAttempts(request: Request): Promise<void> {
  const key = createAttemptKey(request);
  await prisma.inviteRateLimit.deleteMany({ where: { key } });
}
