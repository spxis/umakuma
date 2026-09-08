import type { StudySource } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";

/**
 * Which record a member's History page reads.
 *
 * Three sources, three tables: a WaniKani attempt is a `StudyReviewAttempt`,
 * a custom-library one is a `CustomStudyReviewAttempt`, and an answer on our
 * own ladder is a `UkReviewAttempt`. The page and the route each normalised
 * the query by hand and both read "anything but custom" as WaniKani - so a
 * member on UmaKuma, which is where everybody starts, opened History and was
 * shown a different source than the one they had just been studying. John
 * had 230 attempts on our ladder and the page drew none of them.
 *
 * One function for both ends, so the client cannot ask for a source the
 * server does not know how to answer.
 */
export function normalizeStudyHistorySource(raw: string | null | undefined, fallback: StudySource): StudySource {
  if (raw === "custom" || raw === "umakuma" || raw === "wanikani") return raw;
  return fallback;
}
