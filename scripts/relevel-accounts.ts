import { PrismaClient } from "@prisma/client";

import { isLocalDatabase } from "../src/lib/localDatabase";
import { ALL_LADDER_COLUMNS } from "../src/lib/uk/ladderColumns";
import { clearUkLevelTotalsCache, syncAccountLevels } from "../src/lib/uk/unLevelServer";

/**
 * Recomputes every member's level on every ladder. Run after `ladder:seed`.
 *
 * The stored levels are a cache - deriving costs 412ms a member, measured -
 * and a cache computed against the ladder as it stood goes stale the moment
 * the ladder is rebuilt. Nothing else recomputes them: a member's level moved
 * only when they answered a review, so after UN 2.0.0 shifted 95 kanji,
 * everyone who had not reviewed since carried a 1.0.0 level on their profile,
 * in the header badge and on the boards. The rebalance runbook is therefore
 * refresh, seed, relevel, and this is the third step.
 *
 * Refuses a remote database without `--allow-remote`, like the cohort scripts:
 * it writes a row per member, and the backup comes first.
 *
 *   pnpm db:backup:prod
 *   pnpm ladder:relevel --allow-remote
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const allowRemote = process.argv.includes("--allow-remote");
  if (!isLocalDatabase(process.env.DATABASE_URL) && !allowRemote) {
    console.error("This is not the local database. Take `pnpm db:backup:prod` first, then pass --allow-remote to mean it.");
    process.exitCode = 1;
    return;
  }

  /* The totals are the thing a seed changes, and this process is fresh, but
     saying so costs nothing and makes the intent readable. */
  clearUkLevelTotalsCache();

  const accounts = await prisma.account.findMany({
    select: { id: true, slug: true, nickname: true, ladderStream: true, unLevel: true, ugLevel: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Relevelling ${accounts.length} accounts on ${ALL_LADDER_COLUMNS.map((c) => c.stream).join(" and ")}...`);

  const moved: string[] = [];
  for (const account of accounts) {
    const before = { UN: account.unLevel, UG: account.ugLevel };
    await syncAccountLevels(account.id);
    const after = await prisma.account.findUnique({ where: { id: account.id }, select: { unLevel: true, ugLevel: true } });
    const changes = ALL_LADDER_COLUMNS.flatMap((columns) => {
      const was = before[columns.stream];
      const now = after?.[columns.accountLevel] ?? was;
      return was === now ? [] : [`${columns.stream} ${was}→${now}`];
    });
    if (changes.length > 0) moved.push(`  ${(account.slug ?? account.nickname).padEnd(20)} ${changes.join(", ")}`);
  }

  console.log(moved.length === 0 ? "Nobody moved." : `${moved.length} moved:\n${moved.join("\n")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
