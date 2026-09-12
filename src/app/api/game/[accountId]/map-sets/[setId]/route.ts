import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { MAP_SET_LIMITS, MAP_SET_VISIBILITY_VALUES } from "@/lib/mapCustomSets";
import { deleteMapSet, updateMapSet } from "@/lib/mapCustomSetsServer";

/**
 * One custom Map set: change it, or remove it.
 *
 * Both are the owner's alone: the set is found by id and account together,
 * so somebody else's id is "no such set" rather than a refusal that confirms
 * it exists.
 */
const editSchema = z
  .object({
    name: z.string().max(MAP_SET_LIMITS.name * 4).optional(),
    regions: z.array(z.union([z.string().max(8), z.number().int()])).max(200).optional(),
    visibility: z.enum(MAP_SET_VISIBILITY_VALUES as [string, ...string[]]).optional(),
  })
  .refine((body) => body.name !== undefined || body.regions !== undefined || body.visibility !== undefined, { message: "empty" });

type Context = { params: Promise<{ accountId: string; setId: string }> };

export async function PATCH(request: Request, context: Context) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/map-sets/[setId]",
    method: "PATCH",
    request,
    execute: async () => {
      const { accountId, setId } = await context.params;
      if (!(await canAccessAccount(request, accountId))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      const parsed = editSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }
      const outcome = await updateMapSet(
        accountId,
        setId,
        parsed.data as Parameters<typeof updateMapSet>[2],
        await isAuthorizedAdmin(request),
      );
      if (!outcome.ok) {
        if ("missing" in outcome) return NextResponse.json({ error: "No such set." }, { status: 404 });
        return NextResponse.json({ error: outcome.problems[0], problems: outcome.problems }, { status: 422 });
      }
      return NextResponse.json({ set: outcome.set });
    },
  });
}

export async function DELETE(request: Request, context: Context) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/map-sets/[setId]",
    method: "DELETE",
    request,
    execute: async () => {
      const { accountId, setId } = await context.params;
      if (!(await canAccessAccount(request, accountId))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      if (!(await deleteMapSet(accountId, setId))) {
        return NextResponse.json({ error: "No such set." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    },
  });
}
