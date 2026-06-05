import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const selectLibrarySchema = z.object({
  libraryId: z.string().trim().min(1),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/libraries",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const libraries = await prisma.customStudyLibrary.findMany({
          where: { accountId },
          orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            externalKey: true,
            name: true,
            description: true,
            itemCount: true,
            isActive: true,
            lastImportedAt: true,
          },
        });

        return NextResponse.json({
          libraries: libraries.map((library) => ({
            ...library,
            lastImportedAt: library.lastImportedAt.toISOString(),
          })),
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load custom libraries." }, { status: 500 });
      }
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/libraries",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const json = await request.json();
        const parsed = selectLibrarySchema.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const ownedLibrary = await prisma.customStudyLibrary.findFirst({
          where: {
            id: parsed.data.libraryId,
            accountId,
          },
          select: { id: true },
        });
        if (!ownedLibrary) {
          return NextResponse.json({ error: "Library not found." }, { status: 404 });
        }

        await prisma.$transaction([
          prisma.customStudyLibrary.updateMany({
            where: {
              accountId,
              id: { not: parsed.data.libraryId },
            },
            data: { isActive: false },
          }),
          prisma.customStudyLibrary.update({
            where: { id: parsed.data.libraryId },
            data: { isActive: true },
          }),
        ]);

        return NextResponse.json({ ok: true, activeLibraryId: parsed.data.libraryId });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not select custom library." }, { status: 500 });
      }
    },
  });
}
