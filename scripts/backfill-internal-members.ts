import { INTERNAL_TENURE_DAYS, qualifiesAsInternal } from "../src/lib/memberKind";
import { prisma } from "../src/lib/prisma";

/**
 * Mark the members who may read the reading challenge.
 *
 * The challenge is one family's arrangement about pocket money, so it is
 * offered to internal members and to nobody else. The people already here
 * when the flag arrived are the ones who have been on the site for a month
 * with a WaniKani connection - that is the whole of the site as it stood -
 * and everyone who joins after this runs starts as an ordinary member.
 *
 * Only ever sets the flag on, and only on accounts that qualify, so it can be
 * run again without taking anybody's access away. Dry run by default.
 *
 *   pnpm internal:backfill
 *   pnpm internal:backfill --apply
 */
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const accounts = await prisma.account.findMany({
    select: { id: true, nickname: true, wkUsername: true, createdAt: true, internal: true },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const pending = accounts.filter(
    (account) =>
      !account.internal &&
      qualifiesAsInternal({ hasWanikani: Boolean(account.wkUsername), createdAt: account.createdAt }, now),
  );

  console.log(`\n${apply ? "APPLYING" : "DRY RUN"} - ${accounts.length} accounts`);
  console.log(`  already internal: ${accounts.filter((account) => account.internal).length}`);
  console.log(`  qualifying (WaniKani, ${INTERNAL_TENURE_DAYS}+ days): ${pending.length}`);
  for (const account of pending) {
    console.log(`    ${account.nickname ?? account.id} (@${account.wkUsername}, joined ${account.createdAt.toISOString().slice(0, 10)})`);
  }

  if (!apply) {
    console.log("\nNothing written. Add --apply to mark them internal.");
    await prisma.$disconnect();
    return;
  }

  for (const account of pending) {
    await prisma.account.update({ where: { id: account.id }, data: { internal: true } });
  }
  console.log(`\nMarked ${pending.length} accounts internal.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
