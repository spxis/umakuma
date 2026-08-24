import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { SUBJECT_TYPES, isSubjectType, type SubjectType } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

type CatalogCandidate = {
  wkSubjectId: number;
  subjectType: string;
  level: number;
  characters: string | null;
  slug: string | null;
  meanings: unknown;
  readings: unknown;
  componentSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
};

const querySchema = z.object({
  subjectId: z.coerce.number().int().positive(),
});

function primaryMeaning(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const rows = raw.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  const primary = rows.find((row) => row.primary === true && typeof row.meaning === "string");
  const fallback = rows.find((row) => typeof row.meaning === "string");
  const value = primary?.meaning ?? fallback?.meaning;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function acceptedReadings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  const accepted = rows.filter((row) => row.accepted_answer !== false && typeof row.reading === "string");
  return accepted
    .map((row) => row.reading)
    .filter((reading): reading is string => typeof reading === "string" && reading.trim().length > 0)
    .map((reading) => reading.trim());
}

function primaryReading(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const rows = raw.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  const accepted = rows.filter((row) => row.accepted_answer !== false && typeof row.reading === "string");
  const primary = accepted.find((row) => row.primary === true);
  const value = primary?.reading ?? accepted[0]?.reading;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function overlap(left: number[], right: number[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function candidateScore(target: CatalogCandidate, candidate: CatalogCandidate): number {
  let score = 0;
  if (acceptedReadings(target.readings).some((reading) => acceptedReadings(candidate.readings).includes(reading))) score += 100;
  if (target.visuallySimilarSubjectIds.includes(candidate.wkSubjectId)) score += 70;
  if (candidate.visuallySimilarSubjectIds.includes(target.wkSubjectId)) score += 60;
  if (overlap(target.componentSubjectIds, candidate.componentSubjectIds)) score += 40;
  if (target.subjectType === candidate.subjectType) score += 20;
  score += Math.max(0, 10 - Math.abs(target.level - candidate.level));
  return score;
}

function normalizeSubjectType(value: string): SubjectType {
  return isSubjectType(value) ? value : SUBJECT_TYPES.vocabulary;
}

function toOption(row: CatalogCandidate) {
  return {
    subjectId: row.wkSubjectId,
    subjectType: normalizeSubjectType(row.subjectType),
    wkLevel: row.level,
    characters: row.characters?.trim() || row.slug?.trim() || String(row.wkSubjectId),
    primaryMeaning: primaryMeaning(row.meanings),
    primaryReading: primaryReading(row.readings),
  };
}

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/comparison",
    method: "GET",
    request,
    execute: async () => {
      try {
        const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const account = await prisma.account.findUnique({ where: { id: accountId }, select: { wkLevel: true } });
        if (!account) {
          return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        const select = {
          wkSubjectId: true,
          subjectType: true,
          level: true,
          characters: true,
          slug: true,
          meanings: true,
          readings: true,
          componentSubjectIds: true,
          visuallySimilarSubjectIds: true,
        } as const;
        const target = await prisma.wkSubjectCatalog.findUnique({ where: { wkSubjectId: parsed.data.subjectId }, select });
        if (!target) {
          return NextResponse.json({ error: "Study item not found." }, { status: 404 });
        }

        const candidates = await prisma.wkSubjectCatalog.findMany({
          where: {
            wkSubjectId: { not: target.wkSubjectId },
            level: { lte: account.wkLevel },
            hiddenAt: null,
            characters: { not: null },
          },
          select,
        });
        if (candidates.length === 0) {
          return NextResponse.json({ error: "No comparison item is available." }, { status: 404 });
        }

        const ranked = candidates
          .map((candidate) => ({ candidate, score: candidateScore(target, candidate) }))
          .sort((left, right) => right.score - left.score);
        const topScore = ranked[0]?.score ?? 0;
        const topPool = ranked.filter((entry) => entry.score === topScore).slice(0, 12);
        const selected = topPool[Math.floor(Math.random() * topPool.length)]?.candidate ?? ranked[0]!.candidate;
        const targetReading = primaryReading(target.readings);
        const selectedReading = primaryReading(selected.readings);
        const canAskReading = target.subjectType !== SUBJECT_TYPES.radical && Boolean(targetReading);
        const answerType = canAskReading && targetReading !== selectedReading && Math.random() < 0.5 ? "reading" : "meaning";
        const prompt = answerType === "reading" ? targetReading : primaryMeaning(target.meanings);

        if (!prompt) {
          return NextResponse.json({ error: "This item does not have a comparison clue." }, { status: 422 });
        }

        return NextResponse.json({ answerType, prompt, distractor: toOption(selected) }, { status: 200 });
      } catch (error) {
        console.error("Failed to build study comparison", error);
        return NextResponse.json({ error: "Could not load a comparison item." }, { status: 500 });
      }
    },
  });
}