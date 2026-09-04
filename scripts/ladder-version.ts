import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  bumpCurriculumVersion,
  classifyCurriculumBump,
  CURRICULUM_VERSION_START,
  describeCurriculumDiff,
  diffCurriculum,
  type LadderShape,
} from "../src/lib/ladder/curriculumVersion";

/**
 * Moves the curriculum version, having worked out which number should move.
 *
 * Compares the ladder in the working tree against the one on `origin/main`,
 * which is the only comparison that answers the question: has what we teach
 * changed since the last time anybody could see it. Comparing against the
 * previous local build would call a rebuild-with-no-changes a change.
 *
 * `--dry-run` prints the classification and writes nothing, which is the mode
 * worth having: it removes the fear from `ladder:refresh` by saying what a
 * rebuild would do before it is committed to.
 */
const FILE = join(process.cwd(), "src/data/kanjiLadder.json");

type LadderFile = LadderShape & {
  kanjiLevel: Record<string, { level: number }>;
  radicalLevel: Record<string, number>;
  vocabularyLevel: Record<string, number>;
  curriculum?: { version: string; bumpedAt: string; changelog: unknown[] };
};

function shapeOf(file: LadderFile): LadderShape {
  return {
    kanji: Object.fromEntries(Object.entries(file.kanjiLevel).map(([key, value]) => [key, value.level])),
    radicals: file.radicalLevel,
    vocabulary: file.vocabularyLevel,
  };
}

function publishedLadder(): LadderFile | null {
  try {
    execFileSync("git", ["fetch", "origin", "--quiet"], { stdio: "inherit" });
    return JSON.parse(
      execFileSync("git", ["show", "origin/main:src/data/kanjiLadder.json"], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }),
    ) as LadderFile;
  } catch {
    return null;
  }
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const current = JSON.parse(readFileSync(FILE, "utf8")) as LadderFile;
  const published = publishedLadder();

  if (!published) {
    console.log("origin/main has no ladder to compare against; treating this as the first version.");
    if (!dryRun) {
      current.curriculum = {
        version: CURRICULUM_VERSION_START,
        bumpedAt: new Date().toISOString(),
        changelog: [],
      };
      writeFileSync(FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");
    }
    console.log(`Curriculum ${CURRICULUM_VERSION_START}.`);
    return;
  }

  const from = published.curriculum?.version ?? CURRICULUM_VERSION_START;
  const diff = diffCurriculum(shapeOf(published), shapeOf(current));
  const bump = classifyCurriculumBump(diff);
  const next = bumpCurriculumVersion(from, bump);
  const summary = describeCurriculumDiff(diff);

  console.log(`Published curriculum: ${from}`);
  console.log(`Change: ${summary}`);
  console.log(`Classified: ${bump}${bump === "none" ? "" : ` -> ${next}`}`);
  if (diff.kanji.moved.length > 0) {
    console.log(`Kanji moved: ${diff.kanji.moved.slice(0, 20).join(" ")}${diff.kanji.moved.length > 20 ? " …" : ""}`);
  }

  if (dryRun) {
    console.log("\nDry run: nothing written.");
    return;
  }
  if (bump === "none") {
    console.log("\nNothing to bump.");
    return;
  }

  const changelog = [
    {
      version: next,
      date: new Date().toISOString().slice(0, 10),
      bump,
      summary,
      kanji: diff.kanji,
      radicals: diff.radicals,
      vocabulary: diff.vocabulary,
    },
    ...((published.curriculum?.changelog ?? []) as unknown[]),
  ];
  current.curriculum = { version: next, bumpedAt: new Date().toISOString(), changelog };
  writeFileSync(FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(`\nCurriculum ${from} -> ${next}. Commit the ladder with the change that caused it.`);
}

main();
