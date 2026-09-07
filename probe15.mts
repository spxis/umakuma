import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({ log: ["error"] });
async function main() {
  const j = await db.account.findFirst({ where: { slug: "johnmorrisdotca" }, select: { id: true, lastSyncedAt: true, lastSyncStatus: true, lastSyncError: true, reviewStatsUpdatedAt: true } });
  console.log("now:", new Date().toISOString());
  console.log("John | lastSynced", j!.lastSyncedAt.toISOString(), "|", j!.lastSyncStatus, j!.lastSyncError ?? "", "| statsCheckpoint", j!.reviewStatsUpdatedAt?.toISOString() ?? null);
  const wk = await db.studyReviewAttempt.findMany({ where: { accountId: j!.id, source: "wanikani" }, orderBy: { submittedAt: "desc" }, take: 5, select: { subjectId: true, result: true, submittedAt: true, subjectType: true } });
  console.log("wanikani attempts:", await db.studyReviewAttempt.count({ where: { accountId: j!.id, source: "wanikani" } }));
  for (const r of wk) console.log("  ", r.submittedAt.toISOString(), r.subjectType, r.subjectId, r.result);
  await db.$disconnect();
}
main();
