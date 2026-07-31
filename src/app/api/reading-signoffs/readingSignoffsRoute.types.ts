import { prisma } from "@/lib/prisma";

export type ReadingSignoffEntryDelegate = typeof prisma.readingSignoffEntry;

export function getReadingSignoffEntryDelegate(): ReadingSignoffEntryDelegate | null {
  return prisma.readingSignoffEntry;
}

export function challengeReadScope(challengeId: string | null): Record<string, unknown> {
  if (!challengeId) {
    return {};
  }

  return {
    OR: [{ challengeId }, { challengeId: null }],
  };
}
