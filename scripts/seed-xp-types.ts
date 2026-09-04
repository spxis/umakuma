import { PrismaClient } from "@prisma/client";

import { XP_AWARDS, XP_BONUSES, XP_DAILY_CAPS, XP_TYPE_NOTES } from "../src/lib/xp/xpAwards";

/**
 * Writes the XP economy into the database from the constants that define it.
 *
 * One vocabulary, not two. The code awards by key and the rows explain what a
 * key means, so a member reading "+50 XP" on their history gets an answer that
 * does not live in a developer's head — and the amount lives in a row so the
 * economy can be retuned without a deploy.
 *
 * Idempotent, and it does not delete: a kind that stops being awarded is
 * retired rather than removed, because events already recorded still point at
 * it and an event that cannot explain itself is worse than a stale row.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  /* Two maps in the code, one table in the database. The split is readability
     - a reader can see the routine economy without the exceptional one on top
     of it - but a streak milestone and a review answered are both simply kinds
     of XP, so nothing downstream is told which map a row came out of. Both are
     read here so a new bonus cannot land without a row, which is how the first
     seeding run wrote nine types and silently missed eleven. */
  const all = [...Object.entries(XP_AWARDS), ...Object.entries(XP_BONUSES)].map(([id, amount]) => ({
    id,
    amount: Number(amount),
  }));

  for (const entry of all) {
    const note = XP_TYPE_NOTES[entry.id] ?? "";
    const label = entry.id
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (character) => character.toUpperCase())
      .trim();
    await prisma.xpType.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        label,
        note,
        amount: entry.amount,
        /* The base allowance. Games widen with the member's rank at award
           time, so this row is the floor rather than the whole truth - the
           note says so, and `xpAwardValue` is where the widening happens. */
        dailyCap: (XP_DAILY_CAPS as Record<string, number | undefined>)[entry.id] ?? null,
      },
      update: {
        label,
        note,
        amount: entry.amount,
        dailyCap: (XP_DAILY_CAPS as Record<string, number | undefined>)[entry.id] ?? null,
        retiredAt: null,
      },
    });
  }

  const known = new Set(all.map((entry) => entry.id));
  const stale = await prisma.xpType.findMany({ where: { retiredAt: null }, select: { id: true } });
  const retiring = stale.filter((row) => !known.has(row.id)).map((row) => row.id);
  if (retiring.length > 0) {
    await prisma.xpType.updateMany({ where: { id: { in: retiring } }, data: { retiredAt: new Date() } });
  }

  console.log(`XP types: ${all.length} written, ${retiring.length} retired.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
