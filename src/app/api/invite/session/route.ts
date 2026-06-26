import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { hashInviteCode, isValidInviteCodeShape, normalizeInviteCode } from "@/lib/inviteCode";
import {
  createInviteSessionToken,
  INVITE_SESSION_COOKIE_NAME,
  INVITE_SESSION_MAX_AGE_SECONDS,
  verifyInviteSessionToken,
} from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";

const inviteLoginSchema = z.object({
  code: z.string().trim().min(1),
});

const INVITE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_INVITE_ATTEMPTS_PER_WINDOW = 12;

type InviteAttemptState = {
  count: number;
  resetAtMs: number;
};

const inviteAttemptByKey = new Map<string, InviteAttemptState>();

function getInviteAttemptKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const firstForwarded = forwardedFor.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const fallbackHost = request.headers.get("host")?.trim();
  const clientPart = firstForwarded || forwardedHost || fallbackHost || "unknown";
  return `invite:${clientPart.toLowerCase()}`;
}

function isInviteRateLimited(key: string): boolean {
  const nowMs = Date.now();
  const state = inviteAttemptByKey.get(key);
  if (!state) {
    return false;
  }

  if (state.resetAtMs <= nowMs) {
    inviteAttemptByKey.delete(key);
    return false;
  }

  return state.count >= MAX_INVITE_ATTEMPTS_PER_WINDOW;
}

function registerInviteFailure(key: string): void {
  const nowMs = Date.now();
  const state = inviteAttemptByKey.get(key);
  if (!state || state.resetAtMs <= nowMs) {
    inviteAttemptByKey.set(key, {
      count: 1,
      resetAtMs: nowMs + INVITE_ATTEMPT_WINDOW_MS,
    });
    return;
  }

  state.count += 1;
  inviteAttemptByKey.set(key, state);
}

function clearInviteFailures(key: string): void {
  inviteAttemptByKey.delete(key);
}

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/invite/session",
    method: "GET",
    request,
    execute: async () => {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get(INVITE_SESSION_COOKIE_NAME)?.value ?? null;
        if (!token) {
          return NextResponse.json({ signedIn: false });
        }

        const payload = verifyInviteSessionToken(token);
        if (!payload?.accountId) {
          cookieStore.delete(INVITE_SESSION_COOKIE_NAME);
          return NextResponse.json({ signedIn: false });
        }

        const account = await prisma.account.findUnique({
          where: { id: payload.accountId },
          select: {
            id: true,
            nickname: true,
            wkUsername: true,
            inviteCodeHash: true,
          },
        });

        if (!account || !account.inviteCodeHash) {
          cookieStore.delete(INVITE_SESSION_COOKIE_NAME);
          return NextResponse.json({ signedIn: false });
        }

        return NextResponse.json({
          signedIn: true,
          account: {
            id: account.id,
            nickname: account.nickname,
            wkUsername: account.wkUsername,
          },
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ signedIn: false }, { status: 500 });
      }
    },
  });
}

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/invite/session",
    method: "POST",
    request,
    execute: async () => {
      try {
        const attemptKey = getInviteAttemptKey(request);
        if (isInviteRateLimited(attemptKey)) {
          return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
        }

        const json = await request.json();
        const parsed = inviteLoginSchema.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const normalized = normalizeInviteCode(parsed.data.code);
        if (!isValidInviteCodeShape(normalized)) {
          return NextResponse.json({ error: "Invite code must be 6 characters." }, { status: 400 });
        }

        const inviteCodeHash = hashInviteCode(normalized);
        const account = await prisma.account.findFirst({
          where: ({ inviteCodeHash } as unknown) as Prisma.AccountWhereInput,
          select: {
            id: true,
            nickname: true,
            wkUsername: true,
          },
        });

        if (!account) {
          registerInviteFailure(attemptKey);
          return NextResponse.json({ error: "Invite code is invalid." }, { status: 401 });
        }

        clearInviteFailures(attemptKey);

        const cookieStore = await cookies();
        cookieStore.set({
          name: INVITE_SESSION_COOKIE_NAME,
          value: createInviteSessionToken({ accountId: account.id }),
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: INVITE_SESSION_MAX_AGE_SECONDS,
        });

        return NextResponse.json({
          ok: true,
          account: {
            id: account.id,
            nickname: account.nickname,
            wkUsername: account.wkUsername,
          },
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not sign in with invite code." }, { status: 500 });
      }
    },
  });
}

export async function DELETE() {
  return withApiRouteTelemetry({
    route: "/api/invite/session",
    method: "DELETE",
    request: undefined,
    execute: async () => {
      try {
        const cookieStore = await cookies();
        cookieStore.delete(INVITE_SESSION_COOKIE_NAME);

        return NextResponse.json({ signedIn: false });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not sign out invite session." }, { status: 500 });
      }
    },
  });
}
