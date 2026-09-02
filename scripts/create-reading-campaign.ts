import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "../src/lib/prisma";
import { carryOverPlan, rulesForTarget, rulesForWindow, targetForRules, weeksInWindow } from "../src/lib/readingCampaignCarryover";
import { readingChallengeMutationSchema } from "../src/lib/readingChallengeValidation";
import type { ReadingChallengeScoringRules } from "../src/lib/readingChallengeRules";

/**
 * Make the next reading campaign from the last one.
 *
 * The admin campaign editor is the tool for this and it needs a signed-in
 * admin in a browser. This is the same write the editor's route makes -
 * validated by the same schema, activated the same way, the previous active
 * campaign completed the same way - with the two things the editor leaves to
 * a second pass done in the same transaction: the members carried across so
 * an adult who opted out stays out, and the readers' books carried across so
 * a book started in July can be checked in tomorrow.
 *
 * Dry run by default. `--apply` writes. Every table it touches is written to
 * a JSON snapshot first, so what was there can be put back by hand.
 *
 *   pnpm campaign:create --definition=<file> --from=<previous campaign id>
 *   pnpm campaign:create --definition=<file> --from=<previous campaign id> --apply
 *
 * The definition file holds the fields a person decides - id, slug, name,
 * description, the three dates, and the target when one has been decided.
 * With a target, the weekly caps are that target spread across the window;
 * without one, the caps are held at the previous campaign's final week and
 * the target is their sum. Either can be changed afterwards in the editor.
 */

type Definition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  startDatePst: string;
  goalDatePst: string;
  tripDatePst: string;
  /** The base a perfect reader reaches on the goal date; the caps are sized to it. */
  targetBaseYen?: number;
};

function argValue(prefix: string): string | null {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const definitionPath = argValue("--definition=");
  const previousId = argValue("--from=");
  if (!definitionPath || !previousId) {
    console.error("usage: pnpm campaign:create --definition=<file> --from=<previous campaign id> [--apply]");
    process.exit(2);
  }

  const definition = JSON.parse(readFileSync(definitionPath, "utf8")) as Definition;

  const previous = await prisma.readingChallenge.findUnique({ where: { id: previousId } });
  if (!previous) {
    console.error(`No campaign "${previousId}".`);
    process.exit(1);
  }

  const weeks = weeksInWindow(definition.startDatePst, definition.goalDatePst);
  const previousRules = previous.scoringRules as ReadingChallengeScoringRules;
  const scoringRules = definition.targetBaseYen === undefined
    ? rulesForWindow(previousRules, weeks)
    : rulesForTarget(previousRules, weeks, definition.targetBaseYen);
  const targetBaseYen = definition.targetBaseYen ?? targetForRules(scoringRules);

  const campaign = readingChallengeMutationSchema.parse({
    id: definition.id,
    slug: definition.slug,
    name: definition.name,
    description: definition.description,
    status: "active",
    currencyCode: "JPY",
    startDatePst: definition.startDatePst,
    goalDatePst: definition.goalDatePst,
    tripDatePst: definition.tripDatePst,
    targetBaseYen,
    scoringRules,
  });

  const [members, books] = await Promise.all([
    prisma.readingChallengeMember.findMany({ where: { challengeId: previous.id }, select: { accountId: true, tracked: true } }),
    prisma.readingChallengeBook.findMany({
      where: { challengeId: previous.id },
      select: { accountId: true, isbn: true, title: true, thumbnailUrl: true, manualCoverUrl: true, infoUrl: true },
    }),
  ]);
  const plan = carryOverPlan(members, books);

  console.log(`\n${apply ? "APPLYING" : "DRY RUN"} - ${campaign.name}`);
  console.log(`  ${campaign.startDatePst} to ${campaign.goalDatePst}, ${weeks} weeks, target ¥${campaign.targetBaseYen.toLocaleString("en-CA")}`);
  console.log(`  weekly cap ¥${scoringRules.weeklyCaps[0]} + bonus cap ¥${scoringRules.bonuses.weeklyCapYen[0]}, from "${previous.name}"`);
  console.log(`  carrying ${plan.members.length} member rows and ${plan.books.length} books`);
  console.log(`  "${previous.name}" (${previous.status}) will be marked completed`);

  if (!apply) {
    console.log("\nNothing written. Add --apply to create it.");
    await prisma.$disconnect();
    process.exit(0);
  }

  /* The snapshot: every row this run could change, before it changes any. */
  const snapshotDir = join(process.cwd(), "backups");
  mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = join(snapshotDir, `reading-campaigns-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        readingChallenge: await prisma.readingChallenge.findMany(),
        readingChallengeMember: await prisma.readingChallengeMember.findMany(),
        readingChallengeBook: await prisma.readingChallengeBook.findMany(),
      },
      null,
      2,
    ),
  );
  console.log(`\nSnapshot written to ${snapshotPath}`);

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.readingChallenge.create({
      data: {
        id: campaign.id,
        slug: campaign.slug,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        currencyCode: campaign.currencyCode,
        startDatePst: campaign.startDatePst,
        goalDatePst: campaign.goalDatePst,
        tripDatePst: campaign.tripDatePst,
        targetBaseYen: campaign.targetBaseYen,
        scoringRules: campaign.scoringRules,
      },
    });
    await tx.readingChallenge.updateMany({ where: { id: { not: row.id }, status: "active" }, data: { status: "completed" } });
    await tx.readingChallengeMember.createMany({
      data: plan.members.map((member) => ({ challengeId: row.id, accountId: member.accountId, tracked: member.tracked })),
      skipDuplicates: true,
    });
    await tx.readingChallengeBook.createMany({
      data: plan.books.map((book) => ({ challengeId: row.id, ...book })),
      skipDuplicates: true,
    });
    return row;
  });

  console.log(`\nCreated "${created.name}" (${created.id}) and activated it.`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
