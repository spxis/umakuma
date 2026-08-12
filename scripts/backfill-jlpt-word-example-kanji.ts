import { PrismaClient, Prisma } from "@prisma/client";

import { loadWaniKaniKanjiCatalog } from "../src/lib/jlptWordExampleCatalog";
import { enrichWordExamplesWithKanji, parseJlptWordExamples } from "../src/lib/jlptWordExamples";

const prisma = new PrismaClient();
const BATCH_SIZE = 20;
const MAX_BATCH_ATTEMPTS = 4;

async function applyBatch(
  batch: Array<{ kanji: string; wordExamples: Prisma.InputJsonValue }>,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_BATCH_ATTEMPTS; attempt += 1) {
    try {
      await prisma.$transaction(
        batch.map((update) => prisma.jlptKanji.update({
          where: { kanji: update.kanji },
          data: { wordExamples: update.wordExamples },
        })),
      );
      return;
    } catch (error) {
      if (attempt === MAX_BATCH_ATTEMPTS) throw error;
      await prisma.$disconnect();
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      await prisma.$connect();
    }
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const catalogRows = await loadWaniKaniKanjiCatalog(prisma);
  const rows = await prisma.jlptKanji.findMany({
    where: { wordExamples: { not: Prisma.DbNull } },
    orderBy: [{ nLevel: "asc" }, { kanji: "asc" }],
    select: { kanji: true, wordExamples: true },
  });

  let updated = 0;
  let unchanged = 0;
  let recognizedReferences = 0;
  const pendingUpdates: Array<{ kanji: string; wordExamples: Prisma.InputJsonValue }> = [];

  for (const row of rows) {
    const current = parseJlptWordExamples(row.wordExamples);
    const enriched = enrichWordExamplesWithKanji(current, catalogRows);
    recognizedReferences += enriched.reduce((count, example) => count + (example.kanjiItems?.length ?? 0), 0);
    if (JSON.stringify(current) === JSON.stringify(enriched)) {
      unchanged += 1;
      continue;
    }

    pendingUpdates.push({
      kanji: row.kanji,
      wordExamples: enriched as Prisma.InputJsonValue,
    });
    updated += 1;
  }

  if (!dryRun) {
    for (let index = 0; index < pendingUpdates.length; index += BATCH_SIZE) {
      await applyBatch(pendingUpdates.slice(index, index + BATCH_SIZE));
    }
  }

  console.log(
    `JLPT word examples ${dryRun ? "dry run" : "backfilled"}: updated=${updated}, unchanged=${unchanged}, total=${rows.length}, references=${recognizedReferences}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });