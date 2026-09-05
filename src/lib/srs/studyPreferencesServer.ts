import "server-only";

import { prisma } from "@/lib/prisma";

import { DEFAULT_STUDY_PREFERENCES, parseStudyPreferences, type StudyPreferences } from "./studyPreferences";

/**
 * A member's own study settings.
 *
 * Stored as one JSON string, parsed defensively, exactly as the site's scoring
 * rules and time-off rules are. A member who has never opened the panel is the
 * common case and reads as the defaults.
 */
export async function memberStudyPreferences(accountId: string): Promise<StudyPreferences> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { studyPreferences: true },
  });
  return parseStudyPreferences(account?.studyPreferences);
}

export async function saveMemberStudyPreferences(
  accountId: string,
  preferences: StudyPreferences,
): Promise<StudyPreferences> {
  /* Round-tripped through the parser so a value that arrives some other way is
     bounded on the way in, not only on the way out. */
  const safe = parseStudyPreferences(JSON.stringify(preferences));
  await prisma.account.update({
    where: { id: accountId },
    data: { studyPreferences: JSON.stringify(safe) },
  });
  return safe;
}

export { DEFAULT_STUDY_PREFERENCES };
