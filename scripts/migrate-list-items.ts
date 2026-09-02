import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { LIST_ITEM_KINDS } from "../src/lib/domainConstants";
import { prisma } from "../src/lib/prisma";
import { attachSubjectIds } from "../src/lib/studyLists";

/**
 * Move every saved list's characters into item rows.
 *
 * A list held a string of characters; it holds items with a kind now. Every
 * character becomes a kanji item in the list's own order, with WaniKani's id
 * where the catalogue names it. Lists that already have items are skipped,
 * so the script can be run again without doubling anything.
 *
 * Dry run by default. `--apply` writes, after a JSON snapshot of every list.
 *
 *   pnpm dlx tsx scripts/migrate-list-items.ts
 *   pnpm dlx tsx scripts/migrate-list-items.ts --apply
 */
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const lists = await prisma.studyList.findMany({
    select: { id: true, name: true, accountId: true, characters: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "asc" },
  });

  const pending = lists.filter((list) => list._count.items === 0 && list.characters.length > 0);
  console.log(`\n${apply ? "APPLYING" : "DRY RUN"} - ${lists.length} lists, ${pending.length} to migrate`);
  for (const list of pending) console.log(`  ${list.name}: ${list.characters.length} characters`);

  if (!apply) {
    console.log("\nNothing written. Add --apply to migrate.");
    await prisma.$disconnect();
    return;
  }

  const snapshotDir = join(process.cwd(), "backups");
  mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = join(snapshotDir, `study-lists-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(snapshotPath, JSON.stringify(lists, null, 2));
  console.log(`\nSnapshot written to ${snapshotPath}`);

  for (const list of pending) {
    const items = await attachSubjectIds(
      [...new Set(list.characters)].map((key) => ({ kind: LIST_ITEM_KINDS.kanji, key })),
    );
    await prisma.studyListItem.createMany({
      data: items.map((item, position) => ({
        listId: list.id,
        kind: item.kind,
        key: item.key,
        subjectId: item.subjectId ?? null,
        position,
        addedByAccountId: list.accountId,
      })),
      skipDuplicates: true,
    });
    console.log(`  ${list.name}: ${items.length} items written`);
  }

  const after = await prisma.studyListItem.count();
  console.log(`\n${after} items in the table now.`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
