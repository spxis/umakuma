import { PrismaClient } from "@prisma/client";

import { diffLadderSeed } from "../src/lib/ladder/ladderSeedPlan";
import { ladderSeedPlan } from "./uk-subjects-plan";

/**
 * Whether what the site serves is what the committed ladder says.
 *
 * Read-only, and exits 2 with the gap rather than fixing it — the same shape as
 * `db:drift:check`, and for the same reason: a script that silently repaired
 * production would hide the fact that a deploy and a seed had come apart.
 */
const prisma = new PrismaClient();

async function main() {
  const { rows } = ladderSeedPlan();
  const stored = await prisma.ukSubject.findMany({
    select: {
      key: true, kind: true, characters: true, level: true,
      wkSubjectId: true, source: true, nLevel: true, schoolGrade: true,
      meanings: true, readings: true, removedAt: true,
    },
  });

  const diff = diffLadderSeed(rows, stored);
  const drift = diff.create.length + diff.update.length + diff.remove.length;

  if (drift === 0) {
    console.log(`In step: ${rows.length.toLocaleString("en-CA")} curriculum rows match the committed ladder.`);
    return;
  }

  console.error(`Drift: ${drift} rows differ from the committed ladder.`);
  console.error(`  missing ${diff.create.length}  changed ${diff.update.length}  stale ${diff.remove.length}`);
  for (const row of diff.create.slice(0, 5)) console.error(`  missing  ${row.key} (level ${row.level})`);
  for (const row of diff.update.slice(0, 5)) console.error(`  changed  ${row.key} -> level ${row.level}`);
  for (const key of diff.remove.slice(0, 5)) console.error(`  stale    ${key}`);
  console.error("Run `pnpm ladder:seed`.");
  process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
