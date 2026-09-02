import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { STUDY_TAG_VALUES } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { clearStudyQueueCache } from "@/lib/studyQueueCache";
import { isMissingStudyTagTableError } from "@/lib/studySubjectTags";

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
  tag: z.enum(STUDY_TAG_VALUES),
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

        let rows: Array<{ subjectId: number; favorite: boolean; trouble: boolean; burned: boolean }> = [];
        try {
          rows = await prisma.studySubjectTag.findMany({
            where,
            select: {
              subjectId: true,
              favorite: true,
              trouble: true,
              burned: true,
            },
          });
        } catch (error) {
          if (!isMissingStudyTagTableError(error)) {
            throw error;
          }
        }

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
          select: { wkSubjectId: true },
        });
        if (!subject) {
          return NextResponse.json({ error: "Subject not found." }, { status: 404 });
        }

        let current: { favorite: boolean; trouble: boolean; burned: boolean } | null = null;
        try {
          current = await prisma.studySubjectTag.findUnique({
            where: {
              accountId_subjectId: {
                accountId,
                subjectId: parsedBody.data.subjectId,
              },
            },
            select: {
              favorite: true,
              trouble: true,
              burned: true,
            },
          });
        } catch (error) {
          if (isMissingStudyTagTableError(error)) {
            return NextResponse.json({ error: "Study tags are unavailable until database updates are applied." }, { status: 503 });
          }
          throw error;
        }

        /* The one tag asked about changes; the other two keep what they had. */
        const next = {
          favorite: current?.favorite ?? false,
          trouble: current?.trouble ?? false,
          burned: current?.burned ?? false,
          [parsedBody.data.tag]: parsedBody.data.enabled,
        };

        if (!next.favorite && !next.trouble && !next.burned) {
          try {
            await prisma.studySubjectTag.deleteMany({
              where: {
                accountId,
                subjectId: parsedBody.data.subjectId,
              },
            });
          } catch (error) {
            if (isMissingStudyTagTableError(error)) {
              return NextResponse.json({ error: "Study tags are unavailable until database updates are applied." }, { status: 503 });
            }
            throw error;
          }
          clearStudyQueueCache(accountId);
          return NextResponse.json({
            tag: {
              subjectId: parsedBody.data.subjectId,
              favorite: false,
              trouble: false,
              burned: false,
            },
          });
        }

        let saved: { subjectId: number; favorite: boolean; trouble: boolean; burned: boolean };
        try {
          saved = await prisma.studySubjectTag.upsert({
            where: {
              accountId_subjectId: {
                accountId,
                subjectId: parsedBody.data.subjectId,
              },
            },
            create: {
              accountId,
              subjectId: parsedBody.data.subjectId,
              ...next,
            },
            update: next,
            select: {
              subjectId: true,
              favorite: true,
              trouble: true,
              burned: true,
            },
          });
        } catch (error) {
          if (isMissingStudyTagTableError(error)) {
            return NextResponse.json({ error: "Study tags are unavailable until database updates are applied." }, { status: 503 });
          }
          throw error;
        }

        clearStudyQueueCache(accountId);

        return NextResponse.json({ tag: saved });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not update tag." }, { status: 500 });
      }
    },
  });
}
