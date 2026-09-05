import { NextResponse } from "next/server";
import { z } from "zod";

import { isAccountVisibility } from "@/lib/accountVisibility";
import { adminAccountDetailResponse, loadAdminAccountDetail } from "@/lib/adminAccountDetail";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { isAgeBand } from "@/lib/srs/ageBand";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * The four details an admin may change, and no others.
 *
 * `.strict()` is the point of the schema as much as the field list is: a body
 * carrying `slug`, `wkUserId` or a token is refused rather than quietly
 * ignored, so a mistake on the client comes back as a 400 instead of looking
 * like it worked. Everything absent from this object is either the member's
 * own to change, derived from something else, or an address other people have
 * already shared.
 *
 * Why these four:
 * - `nickname` is what admin surfaces call the member. Nothing links by it, so
 *   fixing a typo costs nothing.
 * - `displayName` is what everyone else reads and anyone can already change,
 *   so an admin correcting an offensive one is moderation rather than surgery.
 * - `visibility` is the member's own choice, but taking a profile off the
 *   public board this minute is the one moderation lever that has to work
 *   without waiting for the member to agree.
 * - `ageBand` decides which SRS themes may be offered, and that set includes
 *   organised crime and the sex trade. Correcting a wrong band is a safety
 *   action, not a preference.
 *
 * `slug` is deliberately absent: it is in every link anybody has shared, and
 * the schema says it is permanent. So are the WaniKani columns - identity is
 * the account, not the connection - and `xp`, which is written by one function
 * on purpose and awarded through `/xp` here.
 */
const patchSchema = z
  .object({
    nickname: z.string().trim().min(2).max(32).optional(),
    /* An empty box means "clear it", which is a null column rather than a
       blank string: the display name falls back to the nickname, and "" would
       render as a member with no name at all. */
    displayName: z.string().trim().max(60).nullish(),
    visibility: z.string().refine(isAccountVisibility, "Unknown visibility.").optional(),
    ageBand: z.string().refine(isAgeBand, "Unknown age band.").optional(),
  })
  .strict();

/** Everything the admin screen for one member draws from. */
export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { id } = await context.params;
        const payload = await loadAdminAccountDetail(id);
        if (!payload) {
          return NextResponse.json({ error: "No such account." }, { status: 404 });
        }

        return NextResponse.json(payload);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load that account." }, { status: 500 });
      }
    },
  });
}

/** Change one or more of the four editable details. */
export async function PATCH(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/admin/accounts/[id]",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { id } = await context.params;
        const parsed = patchSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          /* The reason, verbatim. "Unknown age band." is worth more to whoever
             is reading the toast than "invalid request payload". */
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid request payload." },
            { status: 400 },
          );
        }

        const { nickname, displayName, visibility, ageBand } = parsed.data;
        if (nickname === undefined && displayName === undefined && visibility === undefined && ageBand === undefined) {
          return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
        }

        const existing = await prisma.account.findUnique({ where: { id }, select: { id: true } });
        if (!existing) {
          return NextResponse.json({ error: "No such account." }, { status: 404 });
        }

        await prisma.account.update({
          where: { id },
          data: {
            ...(nickname === undefined ? {} : { nickname }),
            ...(displayName === undefined ? {} : { displayName: displayName?.length ? displayName : null }),
            ...(visibility === undefined ? {} : { visibility }),
            ...(ageBand === undefined ? {} : { ageBand }),
          },
        });

        return adminAccountDetailResponse(id);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not save those details." }, { status: 500 });
      }
    },
  });
}
