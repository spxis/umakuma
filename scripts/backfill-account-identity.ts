import { PrismaClient } from "@prisma/client";

import { generateFriendlyName, slugify, uniqueSlug } from "../src/lib/accountIdentity";

/**
 * Gives every existing account a slug and a display name.
 *
 * The slug is taken from the WaniKani username, because that is what every
 * link anyone has shared already says — backfilling anything else would break
 * those links. The display name starts as the nickname the invite gave them,
 * which is what the site has been calling them all along.
 *
 * Safe to run more than once: an account that already has a slug is left alone.
 *
 * Usage: pnpm dlx tsx scripts/backfill-account-identity.ts [--dry-run]
 */

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const accounts = await prisma.account.findMany({
    select: { id: true, nickname: true, wkUsername: true, slug: true, displayName: true },
    orderBy: { createdAt: "asc" },
  });

  const taken = new Set(accounts.map((a) => a.slug).filter((s): s is string => Boolean(s)));
  let updated = 0;

  for (const account of accounts) {
    if (account.slug) {
      continue;
    }

    // The username is the address people already have; fall back to the
    // nickname, then to a generated name for an account with neither.
    const preferred =
      slugify(account.wkUsername) ?? slugify(account.nickname) ?? generateFriendlyName();
    const slug = uniqueSlug(preferred, taken);
    taken.add(slug);

    const displayName = account.displayName ?? account.nickname ?? null;
    console.log(`  ${account.nickname.padEnd(12)} -> /${slug}${displayName ? `  (“${displayName}”)` : ""}`);

    if (!dryRun) {
      await prisma.account.update({ where: { id: account.id }, data: { slug, displayName } });
    }
    updated += 1;
  }

  console.log(dryRun ? `\nDry run: ${updated} account(s) would change.` : `\nBackfilled ${updated} account(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
