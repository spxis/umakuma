/**
 * Whether both ladders still obey the rules they promise.
 *
 * The curriculum is recomputed from its sources on every build, so nothing here
 * is checking that a number has not changed — the numbers are meant to change.
 * It checks the invariants: no character arriving before its parts, no word
 * before the kanji it is written with, no band or school year finishing later
 * than the ladder claims, no level that is a wall.
 *
 * Read-only, and file-only, so it runs in CI without a database. Exits 2 with
 * the offenders rather than fixing anything, the same shape as `db:drift:check`
 * and for the same reason.
 */
import fs from "node:fs/promises";
import path from "node:path";

import {
  checkEveryKanjiTaughtOnce,
  checkFirstLevelIsRadicalsOnly,
  checkGradePromise,
  checkJlptPromise,
  checkLevelShape,
  checkRadicalsComeFirst,
  checkWordsFollowTheirKanji,
} from "../src/lib/ladder/ladderRules.mjs";

const DATA = path.resolve("src/data");

async function readJson(relative) {
  return JSON.parse(await fs.readFile(path.join(DATA, relative), "utf8"));
}

/** WaniKani's vocabulary, as the words rule wants it. */
async function loadWords() {
  const dir = path.join(DATA, "wk-catalog-levels");
  const files = (await fs.readdir(dir)).filter((name) => name.startsWith("level-"));
  const words = [];
  for (const file of files) {
    const level = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
    for (const word of level.vocabulary ?? []) {
      if (word.hiddenAt || !word.characters) continue;
      words.push({ id: word.wkSubjectId, characters: word.characters });
    }
  }
  return words;
}

function report(name, violations) {
  if (violations.length === 0) {
    console.log(`  ${name}: every rule holds`);
    return 0;
  }
  console.error(`  ${name}: ${violations.length} rule${violations.length === 1 ? "" : "s"} broken`);
  for (const violation of violations) {
    console.error(`    ✗ ${violation.rule} — ${violation.detail}`);
    if (violation.offenders?.length) console.error(`        ${violation.offenders.join("  ")}`);
  }
  return violations.length;
}

async function main() {
  const uk = await readJson("kanjiLadder.json");
  const ug = await readJson("gradeLadder.json").catch(() => null);
  const radicals = (await readJson("radicals/index.json")).radicals;
  const words = await loadWords();
  const expected = new Set(Object.keys(uk.kanjiLevel));

  console.log(`Checking ${expected.size} kanji, ${radicals.length} radicals, ${words.length} words.\n`);

  const shared = (ladder) => [
    ...checkEveryKanjiTaughtOnce(ladder, expected),
    ...checkLevelShape(ladder),
    ...checkFirstLevelIsRadicalsOnly(ladder),
    ...checkRadicalsComeFirst(ladder, radicals),
    ...checkWordsFollowTheirKanji(ladder, words),
  ];

  let broken = 0;
  console.log("UK · the exam ladder");
  broken += report("UK", [...shared(uk), ...checkJlptPromise(uk)]);

  if (ug) {
    console.log("\nUG · the school ladder");
    broken += report("UG", [...shared(ug), ...checkGradePromise(ug, ug.gradeMilestones)]);
  } else {
    console.log("\nUG · not built yet, skipped");
  }

  if (broken > 0) {
    console.error(`\n${broken} broken. The ladder has not been written by this script; fix the build or the ops.`);
    process.exitCode = 2;
    return;
  }
  console.log("\nBoth ladders hold.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
