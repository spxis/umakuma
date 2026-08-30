import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

import type { SchoolGradeFilePayload, SchoolGradeIndexPayload } from "../src/lib/schoolGrades.types";

const prisma = new PrismaClient();
const DATA_DIR = path.resolve("src/data/school-grades");

async function main() {
  const indexPath = path.join(DATA_DIR, "index.json");
  const rawIndex = await fs.readFile(indexPath, "utf8");
  const index = JSON.parse(rawIndex) as SchoolGradeIndexPayload;

  console.log(`Starting School Grade DB Seed (${index.grades.length} grades listed in index)...`);

  let totalUpserted = 0;

  for (const gradeItem of index.grades) {
    const gradeFilePath = path.join(DATA_DIR, gradeItem.filePath);
    const rawGrade = await fs.readFile(gradeFilePath, "utf8");
    const gradePayload = JSON.parse(rawGrade) as SchoolGradeFilePayload;

    console.log(`Processing Grade ${gradePayload.grade} (${gradePayload.kanji.length} kanji)...`);

    for (const item of gradePayload.kanji) {
      await prisma.schoolGradeKanji.upsert({
        where: { kanji: item.kanji },
        create: {
          kanji: item.kanji,
          grade: item.grade,
          category: item.category.code,
          categoryName: item.category.name,
          categoryAbbr: item.category.abbr,
          strokeCount: item.strokeCount,
          frequencyRank: item.frequencyRank,
          unicodeHex: item.unicodeHex,
          primaryMeaning: item.primaryMeaning,
          meanings: item.meanings,
          onReadings: item.readings.on,
          kunReadings: item.readings.kun,
          nanoriReadings: item.readings.nanori ?? [],
          heisigKeyword: item.heisigKeyword,
        },
        update: {
          grade: item.grade,
          category: item.category.code,
          categoryName: item.category.name,
          categoryAbbr: item.category.abbr,
          strokeCount: item.strokeCount,
          frequencyRank: item.frequencyRank,
          unicodeHex: item.unicodeHex,
          primaryMeaning: item.primaryMeaning,
          meanings: item.meanings,
          onReadings: item.readings.on,
          kunReadings: item.readings.kun,
          nanoriReadings: item.readings.nanori ?? [],
          heisigKeyword: item.heisigKeyword,
        },
      });

      totalUpserted += 1;
    }
  }

  console.log(`Successfully seeded ${totalUpserted} school grade kanji into database.`);
}

main()
  .catch((err) => {
    console.error("Failed to seed school grade kanji:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
