import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { importWanikaniProgress, planUkImport } from "@/lib/uk/ukImportServer";

type RouteContext = { params: Promise<{ accountId: string }> };

/** What an import would do. Shown before it is run, since it raises a floor. */
export async function GET(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/import",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const planned = await planUkImport(accountId);
        if (!planned) return NextResponse.json({ available: false });
        return NextResponse.json({
          available: true,
          wkLevel: planned.wkLevel,
          floor: planned.plan.floor,
          ...planned.plan.summary,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read your WaniKani progress." }, { status: 500 });
      }
    },
  });
}

/**
 * Carries the progress across.
 *
 * Raise-only throughout, so running it twice is safe and running it after six
 * months of study here cannot walk that study back.
 */
export async function POST(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/import",
    method: "POST",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const result = await importWanikaniProgress(accountId);
        if (!result) {
          return NextResponse.json({ error: "No WaniKani progress to import." }, { status: 409 });
        }
        return NextResponse.json(result);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not import your progress." }, { status: 500 });
      }
    },
  });
}
