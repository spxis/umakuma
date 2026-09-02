import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "../src/lib/prisma";
import { rulesForTarget } from "../src/lib/readingCampaignCarryover";
import { readingChallengeMutationSchema } from "../src/lib/readingChallengeValidation";
import type { ReadingChallengeScoringRules } from "../src/lib/readingChallengeRules";

/**
 * Give a campaign that already exists a different base target.
 *
 * The target a leaderboard shows is only a number; what a reader can actually
 * earn is the sum of the weekly caps. Changing one without the other leaves a
 * campaign that says ¥40,000 and pays ¥96,000, or the reverse. This changes
 * both at once, the same way `campaign:create` sizes a new one: the target
 * spread flat across the campaign's own weeks, the bonus caps kept in the
 * campaign's own proportion of bonus to base.
 *
 * Dry run by default. `--apply` writes, after a JSON snapshot of the row.
 *
 *   pnpm campaign:reprice --id=<campaign id> --target=<yen>
 *   pnpm campaign:reprice --id=<campaign id> --target=<yen> --apply
 */

function argValue(prefix: string): string | null {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const id = argValue("--id=");
  const target = Number(argValue("--target="));
  if (!id || !Number.isInteger(target)) {
    console.error("usage: pnpm campaign:reprice --id=<campaign id> --target=<yen> [--apply]");
    process.exit(2);
  }

  const campaign = await prisma.readingChallenge.findUnique({ where: { id } });
  if (!campaign) {
    console.error(`No campaign "${id}".`);
    process.exit(1);
  }

  const current = campaign.scoringRules as ReadingChallengeScoringRules;
  const scoringRules = rulesForTarget(current, current.weeklyCaps.length, target);
  const next = readingChallengeMutationSchema.parse({
    id: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    currencyCode: campaign.currencyCode,
    startDatePst: campaign.startDatePst,
    goalDatePst: campaign.goalDatePst,
    tripDatePst: campaign.tripDatePst,
    targetBaseYen: target,
    scoringRules,
  });

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  console.log(`\n${apply ? "APPLYING" : "DRY RUN"} - ${campaign.name}`);
  console.log(`  target ¥${Number(campaign.targetBaseYen).toLocaleString("en-CA")} -> ¥${next.targetBaseYen.toLocaleString("en-CA")}`);
  console.log(`  base caps ${current.weeklyCaps.join(", ")} (¥${sum(current.weeklyCaps).toLocaleString("en-CA")})`);
  console.log(`         -> ${scoringRules.weeklyCaps.join(", ")} (¥${sum(scoringRules.weeklyCaps).toLocaleString("en-CA")})`);
  console.log(`  bonus caps ${current.bonuses.weeklyCapYen.join(", ")} (¥${sum(current.bonuses.weeklyCapYen).toLocaleString("en-CA")})`);
  console.log(`          -> ${scoringRules.bonuses.weeklyCapYen.join(", ")} (¥${sum(scoringRules.bonuses.weeklyCapYen).toLocaleString("en-CA")})`);

  if (!apply) {
    console.log("\nNothing written. Add --apply to change it.");
    await prisma.$disconnect();
    process.exit(0);
  }

  const snapshotDir = join(process.cwd(), "backups");
  mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = join(snapshotDir, `reading-campaign-${campaign.id}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(snapshotPath, JSON.stringify(campaign, null, 2));
  console.log(`\nSnapshot written to ${snapshotPath}`);

  await prisma.readingChallenge.update({
    where: { id: campaign.id },
    data: { targetBaseYen: next.targetBaseYen, scoringRules: next.scoringRules },
  });
  console.log(`\nRepriced "${campaign.name}" to ¥${next.targetBaseYen.toLocaleString("en-CA")}.`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
