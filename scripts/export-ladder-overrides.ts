import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

/**
 * Writes the admin's edits into the file the build reads.
 *
 * This is the bridge that makes an edit survive `pnpm ladder:refresh`. The
 * database is the live log — an edit reaches members the moment it is made —
 * but Vercel's filesystem is read-only and the build runs in CI without a
 * database, so the build can only read a committed file. Four layers, one
 * writer each, and this is the writer of the file.
 *
 * Ops are stamped `exportedAt` as they go, which is also what stops them being
 * withdrawn afterwards: once an op is in the committed file the build replays
 * it from there, and deleting the row would leave the two disagreeing.
 */
const prisma = new PrismaClient();
const FILE = join(process.cwd(), "src/data/kanjiLadderOverrides.json");

async function main(): Promise<void> {
  const pending = await prisma.ladderOverride.findMany({
    where: { exportedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const exported = await prisma.ladderOverride.findMany({
    where: { exportedAt: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    console.log("Nothing to export: every edit is already in the committed ladder.");
    return;
  }

  const all = [...exported, ...pending];
  writeFileSync(
    FILE,
    `${JSON.stringify(
      {
        version: 1,
        ops: all.map((row) => ({
          id: row.id,
          op: row.op,
          kind: row.kind,
          key: row.key,
          from: row.fromLevel,
          to: row.toLevel,
          by: row.by,
          at: row.createdAt.toISOString(),
          ...(row.reason ? { reason: row.reason } : {}),
          ...(row.payload ? { payload: row.payload } : {}),
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await prisma.ladderOverride.updateMany({
    where: { id: { in: pending.map((row) => row.id) } },
    data: { exportedAt: new Date() },
  });

  console.log(`Wrote ${all.length} ops (${pending.length} new) to src/data/kanjiLadderOverrides.json.`);
  console.log("Now: pnpm build:kanji-ladder, then commit the ladder and the overrides together.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
