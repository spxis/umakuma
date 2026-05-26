import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isAuthorizedAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { readingChallengeStatusSchema } from "@/lib/readingChallengeValidation";

const updateStatusSchema = z.object({
  id: z.string().min(1).max(120),
  status: readingChallengeStatusSchema,
});

function isRecordNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "P2025";
}

async function deactivateOtherActiveCampaigns(campaignId: string): Promise<void> {
  await prisma.readingChallenge.updateMany({
    where: {
      id: { not: campaignId },
      status: "active",
    },
    data: {
      status: "completed",
    },
  });
}

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/reading-campaigns/status",
    method: "POST",
    request,
    execute: async () => {
      try {
        const parsed = updateStatusSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const updated = await prisma.readingChallenge.update({
          where: { id: parsed.data.id },
          data: { status: parsed.data.status },
          select: {
            id: true,
            status: true,
            slug: true,
            name: true,
            updatedAt: true,
          },
        });

        if (updated.status === "active") {
          await deactivateOtherActiveCampaigns(updated.id);
        }

        return NextResponse.json({ campaign: updated }, { status: 200 });
      } catch (error) {
        if (isRecordNotFoundError(error)) {
          return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
        }

        console.error(error);
        return NextResponse.json({ error: "Could not update campaign status." }, { status: 500 });
      }
    },
  });
}
