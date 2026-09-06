import { PrismaClient } from "@prisma/client";

/**
 * Says, once and explicitly, what every answer already in production was given
 * against.
 *
 * John: "Since I've already done reviews against this original version, before
 * we even started UG, those were the original 1.0." He is right, and the
 * columns were deliberately left nullable rather than defaulted so that this
 * would be a statement somebody made rather than an assumption a schema
 * quietly asserted on rows nobody had looked at.
 *
 * Every attempt written before today was answered on the exam ladder — UG did
 * not exist — against the only arrangement of it there has ever been. That is
 * curriculum 1.0.0, whatever the ladder moves to next.
 *
 * Idempotent: it touches only rows with no stamp, so running it twice changes
 * nothing the second time. `--dry-run` counts without writing.
 */
const prisma = new PrismaClient();

const ORIGINAL_STREAM = "UN" as const;
const ORIGINAL_VERSION = "1.0.0";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const unstamped = await prisma.ukReviewAttempt.count({ where: { curriculumVersion: null } });
  const stamped = await prisma.ukReviewAttempt.count({ where: { curriculumVersion: { not: null } } });
  const earliest = await prisma.ukReviewAttempt.findFirst({
    where: { curriculumVersion: null },
    orderBy: { submittedAt: "asc" },
    select: { submittedAt: true },
  });

  console.log(`${unstamped.toLocaleString("en-CA")} answers carry no curriculum stamp; ${stamped.toLocaleString("en-CA")} already do.`);
  if (earliest) console.log(`  the earliest was answered ${earliest.submittedAt.toISOString().slice(0, 10)}`);

  if (unstamped === 0) {
    console.log("Nothing to backfill.");
    return;
  }
  if (dryRun) {
    console.log(`Dry run: would stamp them ${ORIGINAL_STREAM} ${ORIGINAL_VERSION}.`);
    return;
  }

  const result = await prisma.ukReviewAttempt.updateMany({
    where: { curriculumVersion: null },
    data: { curriculumStream: ORIGINAL_STREAM, curriculumVersion: ORIGINAL_VERSION },
  });
  console.log(`Stamped ${result.count.toLocaleString("en-CA")} answers ${ORIGINAL_STREAM} ${ORIGINAL_VERSION}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
