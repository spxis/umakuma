import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { AGE_BAND_VALUES, isAgeBand } from "@/lib/srs/ageBand";
import { prisma } from "@/lib/prisma";
import { memberTheme, saveMemberTheme } from "@/lib/srs/srsThemeServer";

const bodySchema = z.object({
  /* Null means "put me back on the default" rather than "leave it alone". */
  themeId: z.string().max(80).nullable().optional(),
  ageBand: z.enum(AGE_BAND_VALUES as [string, ...string[]]).optional(),
});

/** The member's theme and the ones their age band may be offered. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/theme",
    method: "GET",
    request,
    execute: async () => {
      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      const { theme, choices } = await memberTheme(id);
      return NextResponse.json({ theme, choices });
    },
  });
}

/**
 * Records a pick, and the age band that decides what may be picked.
 *
 * Both in one route because they are one question to a member — "who is using
 * this, and how would they like it to read" — and because setting the band has
 * to be able to take a theme away as well as offer one.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/theme",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, id))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        /* The band first: it decides what the theme may be. */
        if (parsed.data.ageBand !== undefined && isAgeBand(parsed.data.ageBand)) {
          await prisma.account.update({ where: { id }, data: { ageBand: parsed.data.ageBand } });
        }

        if (parsed.data.themeId !== undefined) {
          await saveMemberTheme(id, parsed.data.themeId);
        }

        const { theme, choices } = await memberTheme(id);
        return NextResponse.json({ theme, choices });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save that theme.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    },
  });
}
