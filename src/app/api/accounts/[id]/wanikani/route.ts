import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { encryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { fetchWaniKani } from "@/lib/wanikani/http";
import type { WaniKaniUserResponse } from "@/lib/wanikani/types";

const bodySchema = z.object({
  token: z.string().trim().min(10).max(200),
});

/**
 * Attach a WaniKani connection to an account that already exists.
 *
 * Distinct from `saveAccountFromToken`, which builds an account out of a
 * token. Identity comes first now: a member signs up, and connecting WaniKani
 * is something they may do afterwards, or never.
 *
 * The token is checked against the API before it is stored, so the member sees
 * the username it resolved to rather than discovering days later that they
 * pasted the wrong thing. It is encrypted at rest and never returned - not
 * here, not anywhere.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/wanikani",
    method: "POST",
    request,
    execute: async () => {
      const { id } = await context.params;

      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Enter your WaniKani API token." }, { status: 400 });
      }

      const token = parsed.data.token;

      let profile: { id: string; username: string; level: number };
      try {
        const response = await fetchWaniKani<WaniKaniUserResponse>("/user", token);
        const data = response.data?.data;
        if (!data?.id || !data.username || typeof data.level !== "number") {
          throw new Error("incomplete profile");
        }
        profile = { id: String(data.id), username: data.username, level: data.level };
      } catch {
        /*
         * Never echo the token back, not even to say which one failed. The
         * message says what to do instead of what went wrong internally.
         */
        return NextResponse.json(
          { error: "WaniKani did not accept that token. Check it and try again." },
          { status: 400 },
        );
      }

      // One WaniKani account cannot back two members, or their leaderboard rows collide.
      const claimed = await prisma.account.findFirst({
        where: { wkUserId: profile.id, NOT: { id } },
        select: { id: true },
      });
      if (claimed) {
        return NextResponse.json(
          { error: "That WaniKani account is already connected to another member." },
          { status: 409 },
        );
      }

      const encrypted = encryptToken(token);
      await prisma.account.update({
        where: { id },
        data: {
          tokenEncrypted: encrypted.encrypted,
          tokenIv: encrypted.iv,
          tokenTag: encrypted.tag,
          wkUserId: profile.id,
          wkUsername: profile.username,
          wkLevel: profile.level,
        },
      });

      // The username and level only; the token does not travel back.
      return NextResponse.json({ wkUsername: profile.username, wkLevel: profile.level });
    },
  });
}
