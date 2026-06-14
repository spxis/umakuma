import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { clearStudyQueueCache } from "@/lib/studyQueueCache";
import { SUBJECT_TYPES } from "@/lib/domainConstants";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const querySchema = z.object({
  subjectIds: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return [] as number[];
      }

      return Array.from(
        new Set(
          value
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      );
    }),
});

const bodySchema = z.object({
  subjectId: z.number().int().positive(),
  tag: z.enum(["favorite", "trouble"]),
  enabled: z.boolean(),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/tags",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const parsedQuery = querySchema.safeParse({
          subjectIds: new URL(request.url).searchParams.get("subjectIds") ?? undefined,
        });
        if (!parsedQuery.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const where = parsedQuery.data.subjectIds.length > 0
          ? {
              accountId,
              subjectId: { in: parsedQuery.data.subjectIds },
            }
          : { accountId };

        const rows = await prisma.studySubjectTag.findMany({
          where,
          select: {
            subjectId: true,
            favorite: true,
            trouble: true,
          },
        });

        return NextResponse.json({
          tags: rows,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load tags." }, { status: 500 });
      }
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/tags",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const json = await request.json();
        const parsedBody = bodySchema.safeParse(json);
        if (!parsedBody.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const subject = await prisma.wkSubjectCatalog.findUnique({
          where: { wkSubjectId: parsedBody.data.subjectId },
          select: { subjectType: true },
        });
        if (!subject || subject.subjectType !== SUBJECT_TYPES.kanji) {
          return NextResponse.json({ error: "Only kanji can be tagged." }, { status: 400 });
        }

        const current = await prisma.studySubjectTag.findUnique({
          where: {
            accountId_subjectId: {
              accountId,
              subjectId: parsedBody.data.subjectId,
            },
          },
          select: {
            favorite: true,
            trouble: true,
          },
        });

        const nextFavorite = parsedBody.data.tag === "favorite"
          ? parsedBody.data.enabled
          : (current?.favorite ?? false);
        const nextTrouble = parsedBody.data.tag === "trouble"
          ? parsedBody.data.enabled
          : (current?.trouble ?? false);

        if (!nextFavorite && !nextTrouble) {
          await prisma.studySubjectTag.deleteMany({
            where: {
              accountId,
              subjectId: parsedBody.data.subjectId,
            },
          });
          clearStudyQueueCache(accountId);
          return NextResponse.json({
            tag: {
              subjectId: parsedBody.data.subjectId,
              favorite: false,
              trouble: false,
            },
          });
        }

        const saved = await prisma.studySubjectTag.upsert({
          where: {
            accountId_subjectId: {
              accountId,
              subjectId: parsedBody.data.subjectId,
            },
          },
          create: {
            accountId,
            subjectId: parsedBody.data.subjectId,
            favorite: nextFavorite,
            trouble: nextTrouble,
          },
          update: {
            favorite: nextFavorite,
            trouble: nextTrouble,
          },
          select: {
            subjectId: true,
            favorite: true,
            trouble: true,
          },
        });

        clearStudyQueueCache(accountId);

        return NextResponse.json({ tag: saved });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not update tag." }, { status: 500 });
      }
    },
  });
}
