import { PrismaClient } from "@prisma/client";

import { XP_AWARDS, XP_BONUSES, XP_DAILY_CAPS, XP_TYPE_NOTES } from "../src/lib/xp/xpAwards";
import { XP_PROPOSED_AWARDS, XP_PROPOSED_NOTES } from "../src/lib/xp/xpProposedAwards";
import priceOverrides from "../src/data/xpPriceOverrides.json";

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
  const all = [
    ...Object.entries(XP_AWARDS),
    ...Object.entries(XP_BONUSES),
    /* Proposed but unwired: they seed so they can be seen and priced in the
       admin screen, and none of them fires until something calls awardXp with
       its key. A row with no caller costs nothing; a kind with no row cannot
       be reviewed. */
    ...Object.entries(XP_PROPOSED_AWARDS),
  ].map(([id, amount]) => ({ id, amount: Number(amount) }));

  /* Committed prices win over the constants. The admin screen decides what an
     award is worth; `pnpm xp:prices:export` carries that decision into the
     repository, and this is where it lands in every environment rather than
     only the one it was made in. */
  const overrides = (priceOverrides as { prices?: Record<string, { amount?: number; dailyCap?: number | null; label?: string; note?: string; retired?: boolean }> }).prices ?? {};

  /* An amount an admin has priced from the site outranks the number in the
     code. Without this, the next seed would silently undo every tuning
     decision - which would make the table pointless, since being able to
     retune without a deploy is the whole reason it exists. */
  const priced = new Set(
    (await prisma.xpType.findMany({ where: { pricedAt: { not: null } }, select: { id: true } })).map(
      (row) => row.id,
    ),
  );

  let repriced = 0;
  for (const entry of all) {
    const override = overrides[entry.id];
    const note =
      override?.note ?? XP_TYPE_NOTES[entry.id] ?? (XP_PROPOSED_NOTES as Record<string, string>)[entry.id] ?? "";
    const amount = override?.amount ?? entry.amount;
    const cap =
      override?.dailyCap !== undefined
        ? override.dailyCap
        : ((XP_DAILY_CAPS as Record<string, number | undefined>)[entry.id] ?? null);
    const label = override?.label ?? entry.id
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (character) => character.toUpperCase())
      .trim();
    /* Skipped only while an edit is still *unexported*. Once it is in the
       committed file the file is authoritative and writing it back is a
       no-op - and if somebody has since edited the file by hand, that is a
       decision the seed should carry, not one pricedAt should block. */
    if (priced.has(entry.id) && !overrides[entry.id]) {
      repriced += 1;
      continue;
    }
    await prisma.xpType.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        label,
        note,
        amount,
        /* The base allowance. Games widen with the member's rank at award
           time, so this row is the floor rather than the whole truth - the
           note says so, and `xpAwardValue` is where the widening happens. */
        dailyCap: cap,
      },
      update: {
        label,
        note,
        amount,
        dailyCap: cap,
        retiredAt: override?.retired ? new Date() : null,
      },
    });
  }

  const known = new Set(all.map((entry) => entry.id));
  const stale = await prisma.xpType.findMany({ where: { retiredAt: null }, select: { id: true } });
  const retiring = stale.filter((row) => !known.has(row.id)).map((row) => row.id);
  if (retiring.length > 0) {
    await prisma.xpType.updateMany({ where: { id: { in: retiring } }, data: { retiredAt: new Date() } });
  }

    const fromFile = all.filter((entry) => overrides[entry.id]).length;
  console.log(
    `XP types: ${all.length - repriced} written (${fromFile} priced from the committed file), ` +
      `${repriced} held as unexported admin edits, ${retiring.length} retired.`,
  );
  if (repriced > 0) console.log("Run `pnpm xp:prices:export` to carry those into the repository.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
