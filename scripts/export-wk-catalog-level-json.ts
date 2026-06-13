import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/lib/prisma";

type Args = {
  outputDir: string;
  includeRawData: boolean;
};

type SubjectRow = {
  wkSubjectId: number;
  object: string;
  subjectType: string;
  level: number;
  slug: string | null;
  characters: string | null;
  documentUrl: string | null;
  dataUpdatedAt: Date;
  hiddenAt: Date | null;
  meanings: unknown;
  readings: unknown;
  componentSubjectIds: number[];
  amalgamationSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
  meaningMnemonic: string | null;
  meaningHint: string | null;
  readingMnemonic: string | null;
  readingHint: string | null;
  rawData: unknown;
  documentVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);

  const outputDirArg = args.find((arg) => arg.startsWith("--output-dir="));
  const outputDir = outputDirArg
    ? outputDirArg.replace("--output-dir=", "").trim()
    : "src/data/wk-catalog-levels";

  return {
    outputDir,
    includeRawData: !args.includes("--omit-raw-data"),
  };
}

function levelFileName(level: number): string {
  return `level-${String(level).padStart(2, "0")}.json`;
}

function sortRows(a: SubjectRow, b: SubjectRow): number {
  return a.wkSubjectId - b.wkSubjectId;
}

function serializeSubject(row: SubjectRow, includeRawData: boolean): Record<string, unknown> {
  return {
    wkSubjectId: row.wkSubjectId,
    object: row.object,
    subjectType: row.subjectType,
    level: row.level,
    slug: row.slug,
    characters: row.characters,
    documentUrl: row.documentUrl,
    dataUpdatedAt: row.dataUpdatedAt.toISOString(),
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
    meanings: row.meanings,
    readings: row.readings,
    componentSubjectIds: row.componentSubjectIds,
    amalgamationSubjectIds: row.amalgamationSubjectIds,
    visuallySimilarSubjectIds: row.visuallySimilarSubjectIds,
    meaningMnemonic: row.meaningMnemonic,
    meaningHint: row.meaningHint,
    readingMnemonic: row.readingMnemonic,
    readingHint: row.readingHint,
    documentVersion: row.documentVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(includeRawData ? { rawData: row.rawData } : {}),
  };
}

async function exportByLevel() {
  const args = parseArgs();
  const outputDir = path.resolve(args.outputDir);

  const rows = (await prisma.wkSubjectCatalog.findMany({
    orderBy: [{ level: "asc" }, { subjectType: "asc" }, { wkSubjectId: "asc" }],
    select: {
      wkSubjectId: true,
      object: true,
      subjectType: true,
      level: true,
      slug: true,
      characters: true,
      documentUrl: true,
      dataUpdatedAt: true,
      hiddenAt: true,
      meanings: true,
      readings: true,
      componentSubjectIds: true,
      amalgamationSubjectIds: true,
      visuallySimilarSubjectIds: true,
      meaningMnemonic: true,
      meaningHint: true,
      readingMnemonic: true,
      readingHint: true,
      rawData: true,
      documentVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  })) as SubjectRow[];

  if (rows.length === 0) {
    throw new Error("wkSubjectCatalog is empty. Run bootstrap first.");
  }

  const rowsByLevel = new Map<number, SubjectRow[]>();
  for (const row of rows) {
    if (!rowsByLevel.has(row.level)) {
      rowsByLevel.set(row.level, []);
    }

    rowsByLevel.get(row.level)?.push(row);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const sortedLevels = Array.from(rowsByLevel.keys()).sort((a, b) => a - b);
  const exportedAt = new Date().toISOString();
  let totalSubjects = 0;

  for (const level of sortedLevels) {
    const levelRows = (rowsByLevel.get(level) ?? []).sort(sortRows);
    const radicals = levelRows.filter((row) => row.subjectType === "radical");
    const kanji = levelRows.filter((row) => row.subjectType === "kanji");
    const vocabulary = levelRows.filter((row) => row.subjectType === "vocabulary");

    totalSubjects += levelRows.length;

    const payload = {
      level,
      exportedAt,
      counts: {
        total: levelRows.length,
        radicals: radicals.length,
        kanji: kanji.length,
        vocabulary: vocabulary.length,
      },
      radicals: radicals.map((row) => serializeSubject(row, args.includeRawData)),
      kanji: kanji.map((row) => serializeSubject(row, args.includeRawData)),
      vocabulary: vocabulary.map((row) => serializeSubject(row, args.includeRawData)),
    };

    const outputPath = path.join(outputDir, levelFileName(level));
    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  const summary = {
    exportedAt,
    levels: sortedLevels.length,
    totalSubjects,
    outputDir,
    includeRawData: args.includeRawData,
    files: sortedLevels.map((level) => levelFileName(level)),
  };

  await fs.writeFile(path.join(outputDir, "index.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`Export complete. levels=${summary.levels} totalSubjects=${summary.totalSubjects} dir=${summary.outputDir}`);
}

exportByLevel()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
