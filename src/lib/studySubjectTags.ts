import "server-only";

import { prisma } from "@/lib/prisma";

export type StudyTagRow = {
  subjectId: number;
  favorite: boolean;
  trouble: boolean;
};

export function isMissingStudyTagTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string; meta?: { table?: string } };
  if (candidate.code !== "P2021") {
    return false;
  }

  const table = candidate.meta?.table ?? "";
  if (table.includes("StudySubjectTag")) {
    return true;
  }

  return (candidate.message ?? "").includes("StudySubjectTag");
}

/** Every item this account has tagged either way. Empty until the table exists. */
export async function fetchStudyTagRows(accountId: string): Promise<StudyTagRow[]> {
  try {
    return await prisma.studySubjectTag.findMany({
      where: {
        accountId,
        OR: [{ favorite: true }, { trouble: true }],
      },
      select: {
        subjectId: true,
        favorite: true,
        trouble: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    if (isMissingStudyTagTableError(error)) {
      return [];
    }
    throw error;
  }
}
