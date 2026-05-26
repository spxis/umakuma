import { prisma } from "@/lib/prisma";
import { ACTIVE_READING_CHALLENGE } from "@/lib/readingChallengeRules";

type ReadingChallengeDelegate = {
  upsert: (args: {
    where: { slug: string };
    update: {
      name: string;
      description: string;
      status: string;
      startDatePst: string;
      goalDatePst: string;
      tripDatePst: string;
      targetBaseYen: number;
      currencyCode: string;
      scoringRules: unknown;
    };
    create: {
      id: string;
      slug: string;
      name: string;
      description: string;
      status: string;
      startDatePst: string;
      goalDatePst: string;
      tripDatePst: string;
      targetBaseYen: number;
      currencyCode: string;
      scoringRules: unknown;
    };
    select: { id: true };
  }) => Promise<{ id: string }>;
};

function getReadingChallengeDelegate(): ReadingChallengeDelegate | null {
  const delegate = (prisma as unknown as { readingChallenge?: ReadingChallengeDelegate }).readingChallenge;
  return delegate ?? null;
}

export async function ensureActiveReadingChallengeId(): Promise<string | null> {
  const readingChallenge = getReadingChallengeDelegate();
  if (!readingChallenge) {
    return null;
  }

  const challenge = ACTIVE_READING_CHALLENGE;
  const saved = await readingChallenge.upsert({
    where: { slug: challenge.slug },
    update: {
      name: challenge.name,
      description: challenge.description,
      status: challenge.status,
      startDatePst: challenge.startDatePst,
      goalDatePst: challenge.goalDatePst,
      tripDatePst: challenge.tripDatePst,
      targetBaseYen: challenge.targetBaseYen,
      currencyCode: challenge.currencyCode,
      scoringRules: challenge.scoringRules,
    },
    create: {
      id: challenge.id,
      slug: challenge.slug,
      name: challenge.name,
      description: challenge.description,
      status: challenge.status,
      startDatePst: challenge.startDatePst,
      goalDatePst: challenge.goalDatePst,
      tripDatePst: challenge.tripDatePst,
      targetBaseYen: challenge.targetBaseYen,
      currencyCode: challenge.currencyCode,
      scoringRules: challenge.scoringRules,
    },
    select: { id: true },
  });

  return saved.id;
}
