import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { saveAccountFromToken } from "@/lib/accountUpsert";
import { isAuthorizedAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { clearExpiredSyncLocks } from "@/lib/sync";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";

const createAccountSchema = z.object({
  nickname: z.string().trim().min(2).max(32),
  token: z.string().trim().min(10),
});

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts",
    method: "POST",
    request: request,
    execute: async () => {

try {
                if (!(await isAuthorizedAdmin(request))) {
                  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
                }

                const json = await request.json();
                const parsed = createAccountSchema.safeParse(json);

                if (!parsed.success) {
                  return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
                }

                const { nickname, token } = parsed.data;
                const account = await saveAccountFromToken({
                  token,
                  nickname,
                });

                return NextResponse.json({ account }, { status: 201 });
              } catch (error) {
                console.error(error);
                return NextResponse.json(
                  { error: "Could not save token. Confirm env vars and token validity." },
                  { status: 500 },
                );
              }
    },
  });
}

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts",
    method: "GET",
    request: request,
    execute: async () => {

try {
                if (!(await isAuthorizedAdmin(request))) {
                  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
                }

                await clearExpiredSyncLocks();

                /* One query, and it either works or it fails loudly.
                   There was a fallback here that re-queried without the
                   newer columns and fabricated their values, added when
                   invite codes landed. It is the compatibility layer
                   AGENTS.md forbids, and worse than dead weight: a real
                   drift between main and the database would have been
                   swallowed into a warning and served as data, which is
                   exactly the failure db:drift:check exists to catch. */
                const accounts = await prisma.account.findMany(({
                  orderBy: [{ score: "desc" }, { wkLevel: "desc" }],
                  select: {
                    id: true,
                    nickname: true,
                    wkUsername: true,
                    wkLevel: true,
                    reviewCount: true,
                    burnedCount: true,
                    pendingReviews: true,
                    radicalCount: true,
                    vocabularyCount: true,
                    apprenticeCount: true,
                    guruCount: true,
                    masterCount: true,
                    enlightenedCount: true,
                    levelKanjiTotal: true,
                    levelKanjiLearned: true,
                    levelKanjiGuruPlus: true,
                    levelKanjiLocked: true,
                    estimatedHoursRemaining: true,
                    lastActivityAt: true,
                    score: true,
                    lastSyncedAt: true,
                    lastSyncStatus: true,
                    isSyncing: true,
                    syncLockUntil: true,
                    joinedByName: true,
                    joinedByEmail: true,
                    inviteCodeUpdatedAt: true,
                    internal: true,
                    userType: true,
                    disabledAt: true,
                    createdAt: true,
                  },
                } as unknown) as Prisma.AccountFindManyArgs);

                return NextResponse.json({ accounts });
              } catch (error) {
                console.error(error);
                return NextResponse.json({ error: "Could not fetch accounts." }, { status: 500 });
              }
    },
  });
}

