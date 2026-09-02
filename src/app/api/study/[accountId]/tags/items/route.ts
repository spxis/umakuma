import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { QUEUE_TYPES } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";
import { fetchStudyTagRows } from "@/lib/studySubjectTags";
import { parseAssignmentCacheRows, srsLabel } from "@/lib/wanikani/helpers";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

type AssignmentFacts = {
  assignmentId: number;
  srsStage: number;
  unlockedAt: string | null;
  startedAt: string | null;
  passedAt: string | null;
  availableAt: string | null;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * What the account's cached assignments say about the tagged items.
 *
 * A tag can outlive an assignment — an item can be tagged from an explorer long
 * before it is unlocked — so anything missing here is reported as locked rather
 * than dropped from the list.
 */
async function loadAssignmentFacts(accountId: string): Promise<Map<number, AssignmentFacts>> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { assignmentCache: true },
  });
  const facts = new Map<number, AssignmentFacts>();
  if (!account) return facts;

  for (const row of parseAssignmentCacheRows(account.assignmentCache)) {
    const subjectId = row.data.subject_id;
    if (typeof subjectId !== "number") continue;
    facts.set(subjectId, {
      assignmentId: row.id,
      srsStage: typeof row.data.srs_stage === "number" ? row.data.srs_stage : 0,
      unlockedAt: readString(row.data.unlocked_at),
      startedAt: readString(row.data.started_at),
      passedAt: readString(row.data.passed_at),
      availableAt: readString(row.data.available_at),
    });
  }
  return facts;
}

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/tags/items",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const tagRows = await fetchStudyTagRows(accountId);
        if (tagRows.length === 0) {
          return NextResponse.json({ items: [] }, { status: 200 });
        }

        const [details, assignments] = await Promise.all([
          getCatalogSubjectDetails(tagRows.map((row) => row.subjectId)),
          loadAssignmentFacts(accountId),
        ]);

        const items = tagRows.flatMap((row) => {
          const subject = details.get(row.subjectId);
          if (!subject) return [];
          const assignment = assignments.get(row.subjectId);
          const srsStage = assignment?.srsStage ?? 0;
          return [{
            assignmentId: assignment?.assignmentId ?? -1,
            queueType: QUEUE_TYPES.review,
            subjectId: subject.subjectId,
            subjectType: subject.subjectType,
            wkLevel: subject.wkLevel,
            characters: subject.characters,
            meanings: subject.meanings,
            readings: subject.readings,
            primaryReadings: subject.primaryReadings,
            jlptLevel: subject.jlptLevel,
            srsStage,
            status: srsLabel(srsStage, srsStage <= 0 || !assignment?.unlockedAt),
            startedAt: assignment?.startedAt ?? null,
            passedAt: assignment?.passedAt ?? null,
            availableAt: assignment?.availableAt ?? null,
            studyTags: { favorite: row.favorite, trouble: row.trouble, burned: row.burned },
          }];
        });

        return NextResponse.json({ items }, { status: 200 });
      } catch (error) {
        console.error("Failed to load tagged items", error);
        return NextResponse.json({ error: "Could not load your lists." }, { status: 500 });
      }
    },
  });
}
