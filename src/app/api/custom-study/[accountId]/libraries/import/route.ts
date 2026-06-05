import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  collectCustomLibraryValidationIssues,
  CustomLibraryValidationError,
  importCustomLibraryPayload,
} from "@/lib/customStudy/customLibraryImport";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const importSchema = z.object({
  payload: z.unknown(),
});

export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/libraries/import",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const json = await request.json();
        const parsed = importSchema.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const result = await importCustomLibraryPayload({
          accountId,
          payload: parsed.data.payload,
        });

        return NextResponse.json({
          ok: true,
          library: {
            id: result.libraryId,
            externalKey: result.externalKey,
            name: result.libraryName,
          },
          summary: {
            createdLibrary: result.createdLibrary,
            importedCount: result.importedCount,
            createdCount: result.createdCount,
            updatedCount: result.updatedCount,
            removedCount: result.removedCount,
          },
        });
      } catch (error) {
        if (error instanceof CustomLibraryValidationError) {
          const issues = collectCustomLibraryValidationIssues(error);
          return NextResponse.json(
            {
              error: issues[0] ?? "Could not parse custom library JSON.",
              issues,
            },
            { status: 400 },
          );
        }

        console.error(error);
        return NextResponse.json({ error: "Could not import custom library." }, { status: 500 });
      }
    },
  });
}
