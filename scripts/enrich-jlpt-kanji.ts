import { PrismaClient } from "@prisma/client";

import { addWaniKaniKanjiToWordExamples } from "../src/lib/jlptWordExampleCatalog";
import type { JlptWordExample } from "../src/lib/jlptTypes";

const prisma = new PrismaClient();

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
}

async function fetchKanjiDetails(kanji: string) {
  const response = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Failed fetch for ${kanji}: ${response.status}`);

  const payload = await response.json() as Record<string, unknown>;
  const wordsResponse = await fetch(`https://kanjiapi.dev/v1/words/${encodeURIComponent(kanji)}`, {
    cache: "no-store",
  });
  const wordsPayload = wordsResponse.ok ? await wordsResponse.json() as unknown : [];

  const meanings = uniqueStrings(payload.meanings);
  const rawWordExamples: JlptWordExample[] = Array.isArray(wordsPayload)
    ? wordsPayload.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const entry = value as Record<string, unknown>;
        const variants = Array.isArray(entry.variants) ? entry.variants : [];
        const firstVariant = variants[0];
        if (!firstVariant || typeof firstVariant !== "object") return [];

        const variant = firstVariant as Record<string, unknown>;
        const meaningsList = Array.isArray(entry.meanings) ? entry.meanings : [];
        const firstMeaning = meaningsList[0];
        const glosses = firstMeaning && typeof firstMeaning === "object" && Array.isArray((firstMeaning as Record<string, unknown>).glosses)
          ? (firstMeaning as Record<string, unknown>).glosses as unknown[]
          : [];
        const written = typeof variant.written === "string" ? variant.written.trim() : "";
        const pronounced = typeof variant.pronounced === "string" ? variant.pronounced.trim() : "";
        const gloss = typeof glosses[0] === "string" ? glosses[0].trim() : "";
        return written || pronounced ? [{ written, pronounced, gloss }] : [];
      }).slice(0, 12)
    : [];

  return {
    strokeCount: typeof payload.stroke_count === "number" ? payload.stroke_count : null,
    frequencyRank: typeof payload.freq_mainichi_shinbun === "number" ? payload.freq_mainichi_shinbun : null,
    schoolGrade: typeof payload.grade === "number" ? payload.grade : null,
    heisigKeyword: typeof payload.heisig_en === "string" ? payload.heisig_en.trim() || null : null,
    unicodeHex: typeof payload.unicode === "string" ? payload.unicode.trim() || null : null,
    sourceJlpt: typeof payload.jlpt === "number" ? payload.jlpt : null,
    primaryMeaning: meanings[0] ?? null,
    meanings,
    onReadings: uniqueStrings(payload.on_readings),
    kunReadings: uniqueStrings(payload.kun_readings),
    nanoriReadings: uniqueStrings(payload.name_readings),
    notes: uniqueStrings(payload.notes),
    wordExamples: await addWaniKaniKanjiToWordExamples(prisma, rawWordExamples),
    enrichedAt: new Date(),
  };
}

async function main() {
  const rows = await prisma.jlptKanji.findMany({
    orderBy: [{ nLevel: "asc" }, { kanji: "asc" }],
    select: { kanji: true },
  });
  if (rows.length === 0) {
    console.log("No JLPT kanji rows found. Run db:seed:jlpt first.");
    return;
  }

  let success = 0;
  let failed = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const { kanji } = rows[index]!;
    try {
      await prisma.jlptKanji.update({ where: { kanji }, data: await fetchKanjiDetails(kanji) });
      success += 1;
      if ((index + 1) % 100 === 0 || index + 1 === rows.length) {
        console.log(`Enriched ${index + 1}/${rows.length} (ok=${success}, failed=${failed})`);
      }
    } catch (error) {
      failed += 1;
      console.error(`Failed to enrich ${kanji}:`, error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  console.log(`Done. success=${success}, failed=${failed}, total=${rows.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });