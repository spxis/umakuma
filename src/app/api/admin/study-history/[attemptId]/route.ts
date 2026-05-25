import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

const paramsSchema = z.object({
  attemptId: z.string().cuid(),
});

const patchBodySchema = z
  .object({
    result: z.enum(["correct", "wrong", "skipped"]).optional(),
    submittedAt: z.string().datetime().optional(),
  })
  .refine((value) => typeof value.result === "string" || typeof value.submittedAt === "string", {
    message: "Invalid request payload.",
  });

export async function PATCH(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/admin/study-history/[attemptId]",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        const parsedParams = paramsSchema.safeParse(await context.params);
        if (!parsedParams.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const parsedBody = patchBodySchema.safeParse(await request.json());
        if (!parsedBody.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const existing = await prisma.studyReviewAttempt.findUnique({
          where: { id: parsedParams.data.attemptId },
          select: { id: true },
        });

        if (!existing) {
          return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
        }

        const updated = await prisma.studyReviewAttempt.update({
          where: { id: existing.id },
          data: {
            ...(parsedBody.data.result ? { result: parsedBody.data.result } : {}),
            ...(parsedBody.data.submittedAt
              ? { submittedAt: new Date(parsedBody.data.submittedAt) }
              : {}),
          },
          select: {
            id: true,
            result: true,
            submittedAt: true,
          },
        });

        return NextResponse.json(
          {
            attempt: {
              id: updated.id,
              result: updated.result,
              submittedAt: updated.submittedAt.toISOString(),
            },
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not update study attempt." }, { status: 500 });
      }
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/admin/study-history/[attemptId]",
    method: "DELETE",
    request,
    execute: async () => {
      try {
        const parsedParams = paramsSchema.safeParse(await context.params);
        if (!parsedParams.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const existing = await prisma.studyReviewAttempt.findUnique({
          where: { id: parsedParams.data.attemptId },
          select: { id: true },
        });

        if (!existing) {
          return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
        }

        await prisma.studyReviewAttempt.delete({ where: { id: existing.id } });
        return NextResponse.json({ ok: true }, { status: 200 });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not delete study attempt." }, { status: 500 });
      }
    },
  });
}
