import { PrismaClient } from "@prisma/client";
async function main() {
  const p = new PrismaClient();
  const accounts = await p.account.findMany({
    select: { id: true, nickname: true, slug: true, wkUsername: true, wkLevel: true },
    orderBy: { createdAt: "asc" },
  });
  const runs = await p.gameRun.count();
  const tags = await p.studySubjectTag.count();
  console.log("BEFORE accounts:", accounts.length, "gameRuns:", runs, "tags:", tags);
  for (const a of accounts) console.log(`  ${a.nickname} /${a.slug ?? "-"} wk=${a.wkUsername ?? "-"} L${a.wkLevel ?? "-"}`);
  await p.$disconnect();
}
main();
