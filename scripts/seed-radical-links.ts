import { PrismaClient } from "@prisma/client";

import { RADICAL_SHAPE_TWINS } from "../src/lib/ladder/radicalShapes";

/**
 * Pairs our radicals with WaniKani's, by shape, and records both names.
 *
 * By shape rather than by character because the two sources spell three of
 * them differently - our 卜 is their ト - and matching on the codepoint left
 * the one John learned as *toe* with no counterpart. `RADICAL_SHAPE_TWINS` is
 * the same table the seed plan pairs on, so the link table and `wkSubjectId`
 * cannot disagree about which radicals are the same radical.
 *
 * This table is also where WaniKani's own name for a radical lives, and the
 * only place it may: `UkSubject` holds our names and nothing of theirs, so a
 * member who has not connected an account never reads their invented content.
 *
 * Idempotent: re-running it updates the names and leaves a `manual` pairing
 * alone, so a link somebody decided by hand is not recomputed away the next
 * time the catalogue syncs.
 */
const prisma = new PrismaClient();

function primaryMeaning(meanings: unknown): string | null {
  if (!Array.isArray(meanings)) return null;
  const entries = meanings as { meaning?: string; primary?: boolean }[];
  return entries.find((entry) => entry.primary)?.meaning ?? entries[0]?.meaning ?? null;
}

async function main(): Promise<void> {
  const ours = await prisma.ukSubject.findMany({
    where: { kind: "radical", removedAt: null },
    select: { id: true, characters: true, meanings: true },
  });
  const theirs = await prisma.wkSubjectCatalog.findMany({
    where: { subjectType: "radical", hiddenAt: null, characters: { not: null } },
    select: { wkSubjectId: true, characters: true, slug: true, meanings: true },
  });

  const theirsByChar = new Map(theirs.map((row) => [row.characters as string, row]));
  const existing = await prisma.ukRadicalLink.findMany({ select: { ukSubjectId: true, matchedBy: true } });
  const manual = new Set(existing.filter((row) => row.matchedBy === "manual").map((row) => row.ukSubjectId));

  let written = 0;
  let skippedManual = 0;
  let unpaired = 0;

  for (const row of ours) {
    const twin = RADICAL_SHAPE_TWINS[row.characters];
    const match = theirsByChar.get(row.characters) ?? (twin ? theirsByChar.get(twin) : undefined);
    if (!match) {
      unpaired += 1;
      continue;
    }
    if (manual.has(row.id)) {
      skippedManual += 1;
      continue;
    }
    const theirName = primaryMeaning(match.meanings) ?? match.slug ?? row.characters;
    const ourName = row.meanings[0] ?? null;
    await prisma.ukRadicalLink.upsert({
      where: { ukSubjectId: row.id },
      create: {
        ukSubjectId: row.id,
        wkSubjectId: match.wkSubjectId,
        characters: row.characters,
        ourName,
        theirName,
      },
      update: { wkSubjectId: match.wkSubjectId, characters: row.characters, ourName, theirName },
    });
    written += 1;
  }

  console.log(`Radical links: ${written} written, ${skippedManual} left as manual, ${unpaired} with no counterpart.`);
  console.log(`Ours: ${ours.length}. Theirs with a character: ${theirs.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
