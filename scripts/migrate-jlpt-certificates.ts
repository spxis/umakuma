import { isJlptSystem, jlptSystemForYear, levelsForSystem } from "../src/lib/jlptCertification";
import { prisma } from "../src/lib/prisma";

/**
 * Move each account's single reported certificate into a row of its own.
 *
 * The profile held one certificate in three columns, so a member who passed a
 * second test overwrote the first. Certificates are rows now, and this carries
 * the answers already given across. Accounts that already have a row for the
 * same sitting are skipped, so it can be run again.
 *
 * Only ever writes new rows: the old columns are left exactly as they are, so
 * nothing is lost if this has to be run twice or read afterwards.
 *
 *   pnpm jlpt:migrate
 *   pnpm jlpt:migrate -- --apply
 */
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const accounts = await prisma.account.findMany({
    where: { jlptLevel: { not: null }, jlptYear: { not: null } },
    select: {
      id: true,
      nickname: true,
      jlptStatus: true,
      jlptSystem: true,
      jlptLevel: true,
      jlptYear: true,
      jlptCertificates: { select: { system: true, level: true, year: true } },
    },
  });

  const pending: Array<{ id: string; nickname: string | null; system: string; level: number; year: number }> = [];
  const skipped: string[] = [];

  for (const account of accounts) {
    const year = account.jlptYear!;
    const level = account.jlptLevel!;
    const stored = account.jlptSystem;
    const system = stored && isJlptSystem(stored) ? stored : jlptSystemForYear(year);

    if (!system || !(levelsForSystem(system) as readonly number[]).includes(level)) {
      skipped.push(`${account.nickname ?? account.id}: ${stored ?? "?"} level ${level} in ${year} is not a certificate`);
      continue;
    }
    if (account.jlptCertificates.some((held) => held.system === system && held.level === level && held.year === year)) {
      continue;
    }

    pending.push({ id: account.id, nickname: account.nickname, system, level, year });
  }

  console.log(`\n${apply ? "APPLYING" : "DRY RUN"} - ${accounts.length} accounts with a reported certificate`);
  for (const row of pending) console.log(`  ${row.nickname ?? row.id}: ${row.system} level ${row.level}, ${row.year}`);
  for (const note of skipped) console.log(`  skipped ${note}`);

  if (!apply) {
    console.log(`\n${pending.length} to write. Nothing written. Add --apply.`);
    await prisma.$disconnect();
    return;
  }

  for (const row of pending) {
    await prisma.jlptCertificate.create({
      data: { accountId: row.id, system: row.system, level: row.level, year: row.year },
    });
  }
  console.log(`\nWrote ${pending.length} certificates.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
