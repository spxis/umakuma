import { GameSubjectCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { GAME_ULTRA_BATCH_SIZE, isGameBatchSize, isGameCategory } from "@/lib/gameMode";
import { buildGameQuestions, hydrateGameQuestions, loadGamePool, toGameRunSummary } from "@/lib/gameModeServer";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  batchSize: z.union([z.literal("all"), z.number().int().refine(isGameBatchSize)]),
  level: z.number().int().min(1).max(60).nullable(),
  category: z.string().refine(isGameCategory),
  hardMode: z.boolean().default(false),
  ultraMode: z.boolean().default(false),
}).refine((body) => !body.ultraMode || body.level !== null, {
  message: "Ultra Mode requires a level.",
  path: ["level"],
});

export async function POST(request: Request, context: { params: Promise<{ accountId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/runs",
    method: "POST",
    request,
    execute: async () => {
      try {
        const json = await request.json();
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { items } = await loadGamePool(accountId, parsed.data.level, parsed.data.category);
        const questionCount = parsed.data.ultraMode || parsed.data.batchSize === "all" ? items.length : parsed.data.batchSize;
        const questionInputs = buildGameQuestions(items, questionCount, parsed.data.hardMode);
        const run = await prisma.$transaction(async (tx) => {
          await tx.gameRun.updateMany({
            where: { accountId, status: "active" },
            data: { status: "abandoned" },
          });
          return tx.gameRun.create({
            data: {
              accountId,
              batchSize: parsed.data.ultraMode ? GAME_ULTRA_BATCH_SIZE : questionCount,
              level: parsed.data.level,
              category: parsed.data.category as GameSubjectCategory,
              hardMode: parsed.data.hardMode,
              questionCount,
              questions: { create: questionInputs },
            },
            include: { questions: { orderBy: { position: "asc" } } },
          });
        });
        const questions = await hydrateGameQuestions(run.questions);

        return NextResponse.json({ run: toGameRunSummary(run), questions }, { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start the game.";
        const status = message.includes("eligible") || message.includes("distinct") ? 422 : 500;
        if (status === 500) console.error("Failed to start game", error);
        return NextResponse.json({ error: status === 422 ? message : "Could not start the game." }, { status });
      }
    },
  });
}
