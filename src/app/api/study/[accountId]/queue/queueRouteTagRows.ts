import { prisma } from "@/lib/prisma";

type StudyTagRow = {
  subjectId: number;
  favorite: boolean;
  trouble: boolean;
};

function isMissingStudyTagTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; meta?: { table?: string } };
  return candidate.code === "P2021" && candidate.meta?.table === "public.StudySubjectTag";
}

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
    });
  } catch (error) {
    if (isMissingStudyTagTableError(error)) {
      return [];
    }
    throw error;
  }
}
