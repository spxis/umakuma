import { PrismaClient } from "@prisma/client";

import { XP_AWARDS, XP_DAILY_CAPS, XP_TYPE_NOTES } from "../src/lib/xp/xpAwards";

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
  /* One map. A streak milestone and a review answered are both just kinds of
     XP, so there is no second list and nothing to keep in step with. */
  const all = Object.entries(XP_AWARDS).map(([id, amount]) => ({ id, amount: Number(amount) }));

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
