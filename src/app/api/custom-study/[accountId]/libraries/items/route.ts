import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const querySchema = z.object({
  libraryId: z.string().trim().min(1),
});

const deleteItemsSchema = z.object({
  libraryId: z.string().trim().min(1),
  itemIds: z.array(z.string().trim().min(1)).min(1).max(1000),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/libraries/items",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          libraryId: url.searchParams.get("libraryId") ?? "",
        });
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const library = await getOwnedCustomLibrary({
          accountId,
          libraryId: parsed.data.libraryId,
        });
        if (!library) {
          return NextResponse.json({ error: "Library not found." }, { status: 404 });
        }

        const items = await prisma.customStudyItem.findMany({
          where: { libraryId: library.id },
          orderBy: [{ wkLevel: "asc" }, { itemType: "asc" }, { externalId: "asc" }],
          select: {
            externalId: true,
            itemType: true,
            wkLevel: true,
            characters: true,
            meanings: true,
            readings: true,
            primaryReading: true,
          },
        });

        return NextResponse.json({
          items: items.map((item) => ({
            id: item.externalId,
            type: item.itemType,
            level: item.wkLevel,
            characters: item.characters,
            meanings: item.meanings,
            readings: item.readings,
            primaryReading: item.primaryReading,
          })),
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load library items." }, { status: 500 });
      }
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/libraries/items",
    method: "DELETE",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const json = await request.json();
        const parsed = deleteItemsSchema.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const library = await getOwnedCustomLibrary({
          accountId,
          libraryId: parsed.data.libraryId,
        });
        if (!library) {
          return NextResponse.json({ error: "Library not found." }, { status: 404 });
        }

        const uniqueItemIds = Array.from(new Set(parsed.data.itemIds.map((itemId) => itemId.trim()).filter(Boolean)));
        if (uniqueItemIds.length === 0) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
          const deleted = await tx.customStudyItem.deleteMany({
            where: {
              libraryId: library.id,
              externalId: { in: uniqueItemIds },
            },
          });

          const remainingCount = await tx.customStudyItem.count({
            where: { libraryId: library.id },
          });

          await tx.customStudyLibrary.update({
            where: { id: library.id },
            data: { itemCount: remainingCount },
          });

          return {
            deletedCount: deleted.count,
            itemCount: remainingCount,
          };
        });

        return NextResponse.json({
          ok: true,
          deletedCount: result.deletedCount,
          itemCount: result.itemCount,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not delete library items." }, { status: 500 });
      }
    },
  });
}
