import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

/**
 * Writes admin-set XP prices into the file the seeder reads.
 *
 * The same bridge the kanji ladder uses, for the same reason. The database is
 * the live log — a repricing takes effect the moment it is saved — but the
 * database is one environment, and a seed run anywhere else knows only what is
 * in the repository. Without this, a decision made on the admin screen would
 * be true in production and nowhere else, and a fresh environment would come
 * up with the numbers a developer happened to type months ago.
 *
 * So: four layers, one writer each. The admin screen writes the row, this
 * writes the file, the file is committed, and `pnpm xp:types:seed` reads the
 * file. `pricedAt` on the row is what stops the seeder overwriting an edit
 * that has not been exported yet.
 */
const prisma = new PrismaClient();
const FILE = join(process.cwd(), "src/data/xpPriceOverrides.json");

async function main(): Promise<void> {
  const priced = await prisma.xpType.findMany({
    where: { pricedAt: { not: null } },
    orderBy: { id: "asc" },
    select: { id: true, amount: true, dailyCap: true, label: true, note: true, retiredAt: true },
  });

  if (priced.length === 0) {
    console.log("Nothing to export: no XP type has been repriced from the admin screen.");
    return;
  }

  writeFileSync(
    FILE,
    `${JSON.stringify(
      {
        version: 1,
        prices: Object.fromEntries(
          priced.map((row) => [
            row.id,
            {
              amount: row.amount,
              dailyCap: row.dailyCap,
              label: row.label,
              note: row.note,
              ...(row.retiredAt ? { retired: true } : {}),
            },
          ]),
        ),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Wrote ${priced.length} repriced XP types to src/data/xpPriceOverrides.json.`);
  console.log("Commit it, and every environment seeds to the same economy.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
