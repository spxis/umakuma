import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * One source for how big a Japanese glyph is drawn.
 *
 * There were three answers and then there were nine. A subject page headed
 * itself at `text-5xl sm:text-6xl`; five list surfaces each typed
 * `text-2xl font-black leading-none` in full and one of the five had drifted
 * to `sm:text-3xl`; a list proposal row used `text-xl` and a note modal
 * `text-4xl`, sizes nothing else on the site used. Nobody decided any of it -
 * it is what five copies do while nobody is reading them together.
 *
 * So a glyph is now one of two things, and this gate is what keeps it that
 * way: the subject of the surface, which takes `glyphTextSizeClass`, or one
 * of many in a row or a chip, which takes `SubjectGlyph` or `SubjectPill`.
 * A surface that genuinely needs its own - a game tile sized to its board, a
 * sentence in prose, the 253-radical picker - says so on the allow list
 * below, with the reason, which is a sentence somebody has to write rather
 * than a class somebody can type.
 */
const repoRoot = process.cwd();
const targetRoot = join(repoRoot, "src", "app");

/* A Tailwind text size on the same line as a marker that the run is Japanese. */
const GLYPH_LINE = /JP_TEXT_CLASS|japaneseTextProps|lang="ja"/;
const SIZE = /\btext-(?:xl|2xl|3xl|4xl|5xl|6xl|7xl)\b/g;

/**
 * Where a hand-written glyph size is the point rather than a copy.
 *
 * Each of these is a shape the shared pieces cannot serve, and each says why.
 */
const ALLOWED = new Map([
  ["src/app/shared/glyphSizes.ts", "owns both sizes"],
  ["src/app/shared/SubjectGlyph.tsx", "the row glyph itself"],
  ["src/app/shared/SubjectPill.tsx", "the chip glyph itself"],
  ["src/app/game/GameChoiceTile.tsx", "a tile is sized to its board, not to a page"],
  ["src/app/game/GameCornersBoard.tsx", "the prompt is sized to the board it sits in"],
  ["src/app/game/GameMapRunner.tsx", "the prompt over a map, sized to the map"],
  ["src/app/shared/ExampleSentences.tsx", "a sentence is prose, and reads at prose size"],
  ["src/app/admin/articles/ArticleProse.tsx", "an article is prose"],
  ["src/app/maps/MapRegionPanel.tsx", "a place name is a heading, not a subject glyph"],
  ["src/app/shared/subject-page/UsedInWordsBlock.tsx", "the compound is a word being read, not a chip"],
  ["src/app/search/SearchAnswers.tsx", "an answer written in Japanese is the answer, not a subject"],
  ["src/app/admin/AdminLadderLevels.tsx", "a whole level's kanji run together on one line, to judge the level's shape rather than to read a subject"],
]);

const files = [];
function walk(dirPath) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) {
      files.push(entryPath);
    }
  }
}
walk(targetRoot);

const violations = [];
for (const absPath of files) {
  const relPath = relative(repoRoot, absPath).split("\\").join("/");
  if (ALLOWED.has(relPath)) continue;

  const content = readFileSync(absPath, "utf8");
  content.split("\n").forEach((line, index) => {
    if (!GLYPH_LINE.test(line)) return;
    for (const match of line.matchAll(SIZE)) {
      violations.push({ file: relPath, line: index + 1, snippet: match[0] });
    }
  });
}

if (violations.length > 0) {
  console.error("Hand-written glyph sizes. Use glyphTextSizeClass, SubjectGlyph or SubjectPill,");
  console.error("or add the file to ALLOWED in scripts/check-glyph-sizes.mjs with the reason.\n");
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  ${violation.snippet}`);
  }
  process.exit(1);
}

console.log(`Glyph size check passed: ${files.length} components scanned, ${ALLOWED.size} shapes allowed by name.`);
