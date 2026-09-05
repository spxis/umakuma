import { prisma } from "@/lib/prisma";
import { clearStudyQueueCache } from "@/lib/studyQueueCache";
import { parseAssignmentCacheRows } from "@/lib/wanikani/helpers";
import { postWaniKani, putWaniKani } from "@/lib/wanikani/http";
import { wanikaniConnection } from "@/lib/wanikaniConnection";
import type { ReviewResult } from "@/lib/domainConstants";

import { MIRROR_ACTIONS, assignmentForSubject, mirrorActionFor, mirrorReviewBody, type MirrorAction } from "./ukWanikaniMirror";

export type MirrorOutcome = { mirrored: MirrorAction | null; reason?: string };

/**
 * Sends a UK review on to WaniKani for a connected member, and never lets
 * WaniKani's answer touch the UK write: the review here is already recorded
 * by the time this runs, and a failure here is logged and reported back as
 * "not mirrored", not thrown. A member playing both systems is what this is
 * for; a member with no token, or an item WaniKani does not teach, is the
 * ordinary case and costs one query.
 */
export async function mirrorUkReviewToWaniKani({
  accountId,
  subjectId,
  result,
  now = new Date(),
}: {
  accountId: string;
  subjectId: number;
  result: ReviewResult;
  now?: Date;
}): Promise<MirrorOutcome> {
  const [account, subject] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: { tokenEncrypted: true, tokenIv: true, tokenTag: true, wkUserId: true, assignmentCache: true },
    }),
    prisma.ukSubject.findUnique({ where: { id: subjectId }, select: { wkSubjectId: true } }),
  ]);
  if (!account || !subject?.wkSubjectId) return { mirrored: null, reason: "not a WaniKani item" };
  const connection = wanikaniConnection(account);
  if (!connection) return { mirrored: null, reason: "no WaniKani connection" };

  const row = assignmentForSubject(parseAssignmentCacheRows(account.assignmentCache), subject.wkSubjectId);
  const decision = row ? mirrorActionFor(row, now) : null;
  if (!decision) return { mirrored: null, reason: "WaniKani is not asking for it" };

  try {
    if (decision.action === MIRROR_ACTIONS.review) {
      await postWaniKani("/reviews", connection.token, mirrorReviewBody(decision.assignmentId, result));
    } else {
      await putWaniKani(`/assignments/${decision.assignmentId}/start`, connection.token, {});
    }
    clearStudyQueueCache(accountId);
    return { mirrored: decision.action };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[uk-mirror] ${decision.action} of assignment ${decision.assignmentId} not accepted: ${message.slice(0, 120)}`);
    return { mirrored: null, reason: "WaniKani did not accept it" };
  }
}
