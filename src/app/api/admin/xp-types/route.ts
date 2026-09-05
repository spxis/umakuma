import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  id: z.string().trim().min(1).max(80),
  /* Multiples of five, the same rule the rank costs follow: a bonus of 37
     beside a rank costing 4,310 reads as an oversight rather than a choice. */
  amount: z.coerce.number().int().min(0).max(100_000).refine((value) => value % 5 === 0, {
    message: "XP values end in a 0 or a 5.",
  }),
  label: z.string().trim().min(1).max(80).optional(),
  note: z.string().trim().max(300).optional(),
  /** Null clears the cap, which means uncapped rather than zero. */
  dailyCap: z.coerce.number().int().min(0).max(100_000).nullable().optional(),
  retired: z.boolean().optional(),
});

/** Every kind of XP, what it is worth, and what it is for. */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/xp-types",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const types = await prisma.xpType.findMany({ orderBy: [{ retiredAt: "asc" }, { amount: "asc" }] });
        return NextResponse.json({ types });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read the XP types." }, { status: 500 });
      }
    },
  });
}

/**
 * Repricing an award.
 *
 * This is the reason the kinds are rows rather than constants: the economy can
 * be tuned from the site without a deploy. The constants remain the source for
 * *which* kinds exist — `pnpm xp:types:seed` creates them — but what each one
 * is worth is decided here, and the seeder does not overwrite an amount an
 * admin has set.
 */
export async function PATCH(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/xp-types",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = patchSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid request." },
            { status: 400 },
          );
        }

        const { id, retired, ...fields } = parsed.data;
        const existing = await prisma.xpType.findUnique({ where: { id }, select: { id: true } });
        if (!existing) return NextResponse.json({ error: "No such XP type." }, { status: 404 });

        const type = await prisma.xpType.update({
          where: { id },
          data: {
            ...fields,
            /* Set once an admin has priced it, so the seeder knows to leave it
               alone rather than reverting to the number in the code. */
            pricedAt: new Date(),
            ...(retired === undefined ? {} : { retiredAt: retired ? new Date() : null }),
          },
        });
        return NextResponse.json({ type });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not save that." }, { status: 500 });
      }
    },
  });
}
