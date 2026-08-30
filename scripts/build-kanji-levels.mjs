import fs from "node:fs/promises";
import path from "node:path";

const JLPT_READINGS_PATH = path.resolve("src/data/jlptReadings.json");
const SCHOOL_GRADES_DIR = path.resolve("src/data/school-grades");
const OUTPUT_PATH = path.resolve("src/data/kanjiLevels.json");

async function loadSchoolGradesMap() {
  const gradeMap = new Map();
  try {
    const indexPath = path.join(SCHOOL_GRADES_DIR, "index.json");
    const indexData = JSON.parse(await fs.readFile(indexPath, "utf8"));
    for (const g of indexData.grades) {
      const filePath = path.join(SCHOOL_GRADES_DIR, g.filePath);
      const gradeData = JSON.parse(await fs.readFile(filePath, "utf8"));
      for (const item of gradeData.kanji) {
        gradeMap.set(item.kanji, {
          schoolGrade: item.grade,
          category: item.category,
        });
      }
    }
  } catch (err) {
    console.warn("Could not load school grades dataset:", err.message);
  }
  return gradeMap;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(JLPT_READINGS_PATH, "utf8"));
  const kanji = Object.keys(raw).filter((char) => typeof char === "string" && char.length > 0);

  console.log(`Resolving school grades for ${kanji.length} kanji from local School Grade Catalog...`);

  const gradeMap = await loadSchoolGradesMap();

  const out = {};
  let matchedCount = 0;
  for (const char of kanji) {
    const info = gradeMap.get(char) ?? null;
    if (info) matchedCount += 1;
    out[char] = {
      schoolGrade: info?.schoolGrade ?? null,
      category: info?.category ?? null,
    };
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(
    `Wrote ${Object.keys(out).length} entries to ${OUTPUT_PATH} (${matchedCount} mapped to elementary grades, zero external API calls).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
