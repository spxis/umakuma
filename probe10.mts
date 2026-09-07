import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({ log: ["error"] });
async function main() {
  const rows = await db.account.findMany({
    where: { tokenEncrypted: { not: null } },
    select: { nickname: true, lastSyncedAt: true, lastSyncStatus: true, isSyncing: true },
    orderBy: { lastSyncedAt: "asc" },
  });
  console.log("now:", new Date().toISOString());
  for (const r of rows) console.log(" ", r.lastSyncedAt.toISOString(), "|", r.nickname, "|", r.lastSyncStatus, r.isSyncing ? "(syncing)" : "");
  await db.$disconnect();
}
main();
