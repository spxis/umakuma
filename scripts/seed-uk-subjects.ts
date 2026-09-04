import { PrismaClient } from "@prisma/client";

import { diffLadderSeed } from "../src/lib/ladder/ladderSeedPlan";
import { ladderSeedPlan } from "./uk-subjects-plan";

/**
 * Makes `UkSubject` agree with the committed ladder.
 *
 * Idempotent: running it twice changes nothing the second time, which is what
 * makes it safe to run after every deploy. Items the ladder no longer places
 * are marked `removedAt` rather than deleted, so a member's progress on a kanji
 * that was pulled and later restored comes back with it.
 */
const prisma = new PrismaClient();

async function main() {
  const { rows, ladder } = ladderSeedPlan();
  const stored = await prisma.ukSubject.findMany({
    select: {
      key: true, kind: true, characters: true, level: true,
      wkSubjectId: true, source: true, nLevel: true, schoolGrade: true, removedAt: true,
    },
  });

  const diff = diffLadderSeed(rows, stored);
  console.log(`Ladder: ${ladder.levels} levels, ${ladder.totalKanji.toLocaleString("en-CA")} kanji`);
  console.log(`Plan:   ${rows.length.toLocaleString("en-CA")} rows`);
  console.log(`  create ${diff.create.length}  update ${diff.update.length}  remove ${diff.remove.length}  unchanged ${diff.unchanged}`);

  if (diff.create.length === 0 && diff.update.length === 0 && diff.remove.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  /* Chunked because 9,271 upserts in one transaction is a long lock. */
  const CHUNK = 500;
  const writes = [...diff.create, ...diff.update];
  for (let index = 0; index < writes.length; index += CHUNK) {
    await Promise.all(
      writes.slice(index, index + CHUNK).map((row) =>
        prisma.ukSubject.upsert({
          where: { key: row.key },
          create: { ...row, removedAt: null },
          update: { ...row, removedAt: null },
        }),
      ),
    );
    console.log(`  wrote ${Math.min(index + CHUNK, writes.length)}/${writes.length}`);
  }

  if (diff.remove.length > 0) {
    await prisma.ukSubject.updateMany({ where: { key: { in: diff.remove } }, data: { removedAt: new Date() } });
    console.log(`  marked ${diff.remove.length} removed`);
  }

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
