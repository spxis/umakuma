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
/**
 * Both ladders, each versioned on its own.
 *
 * UK and UG move for different reasons and at different times - a school-year
 * rebalance is not a change to the exam ladder - so one version across both
 * would say less than nothing. A member's answer records which stream it was
 * against precisely because the two numbers are independent.
 */
const LADDER_FILES = [
  { stream: "UK", file: join(process.cwd(), "src/data/kanjiLadder.json"), published: "src/data/kanjiLadder.json" },
  { stream: "UG", file: join(process.cwd(), "src/data/gradeLadder.json"), published: "src/data/gradeLadder.json" },
];

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

function publishedLadder(path: string): LadderFile | null {
  try {
    return JSON.parse(
      execFileSync("git", ["show", `origin/main:${path}`], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }),
    ) as LadderFile;
  } catch {
    return null;
  }
}

function stamp(stream: string, file: string, publishedPath: string, dryRun: boolean): void {
  const current = JSON.parse(readFileSync(file, "utf8")) as LadderFile;
  const published = publishedLadder(publishedPath);
  console.log(`\n${stream}`);

  if (!published) {
    console.log("origin/main has no ladder to compare against; treating this as the first version.");
    if (!dryRun) {
      current.curriculum = {
        version: CURRICULUM_VERSION_START,
        bumpedAt: new Date().toISOString(),
        changelog: [],
      };
      writeFileSync(file, `${JSON.stringify(current, null, 2)}\n`, "utf8");
    }
    console.log(`  Curriculum ${CURRICULUM_VERSION_START}.`);
    return;
  }

  const from = published.curriculum?.version ?? CURRICULUM_VERSION_START;
  const diff = diffCurriculum(shapeOf(published), shapeOf(current));
  const bump = classifyCurriculumBump(diff);
  const next = bumpCurriculumVersion(from, bump);
  const summary = describeCurriculumDiff(diff);

  console.log(`  Published curriculum: ${from}`);
  console.log(`  Change: ${summary}`);
  console.log(`  Classified: ${bump}${bump === "none" ? "" : ` -> ${next}`}`);
  if (diff.kanji.moved.length > 0) {
    console.log(`  Kanji moved: ${diff.kanji.moved.slice(0, 20).join(" ")}${diff.kanji.moved.length > 20 ? " …" : ""}`);
  }

  if (dryRun) {
    console.log("  Dry run: nothing written.");
    return;
  }
  if (bump === "none") {
    /* A ladder that has never been stamped gets its first version even when
       nothing moved - which is the case this whole script existed for and
       never covered, so nothing carried a version at all. */
    if (!current.curriculum) {
      current.curriculum = { version: from, bumpedAt: new Date().toISOString(), changelog: [] };
      writeFileSync(file, `${JSON.stringify(current, null, 2)}\n`, "utf8");
      console.log(`  Nothing moved, but it carried no version; stamped ${from}.`);
      return;
    }
    console.log("  Nothing to bump.");
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
  writeFileSync(file, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(`  Curriculum ${from} -> ${next}. Commit the ladder with the change that caused it.`);
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  try {
    execFileSync("git", ["fetch", "origin", "--quiet"], { stdio: "inherit" });
  } catch {
    console.log("Could not reach origin; comparing against nothing.");
  }
  for (const ladder of LADDER_FILES) stamp(ladder.stream, ladder.file, ladder.published, dryRun);
}

main();
