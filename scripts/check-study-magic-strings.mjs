import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const targetRoot = join(repoRoot, "src", "app", "users", "[nickname]", "study-explorer");

const includeExtensions = new Set([".ts", ".tsx"]);
const excludedRelativePaths = new Set([
  "src/app/users/[nickname]/study-explorer/lib/studyExplorerDomain.ts",
  "src/app/users/[nickname]/study-explorer/lib/studyExplorerTypes.ts",
  "src/app/users/[nickname]/study-explorer/lib/studyExplorerLogic.test.ts",
  "src/app/users/[nickname]/study-explorer/components/StudyExplorer.constants.ts",
  "src/app/users/[nickname]/study-explorer/components/StudyReviewModal.types.ts",
]);

const forbiddenPatterns = [
  {
    label: "queueType literal compare",
    regex: /queueType\s*[!=]==\s*"(?:review|lesson)"/g,
  },
  {
    label: "subjectType literal compare",
    regex: /subjectType\s*[!=]==\s*"(?:radical|kanji|vocabulary)"/g,
  },
  {
    label: "status locked literal compare",
    regex: /status\s*[!=]==\s*"locked"/g,
  },
  {
    label: "review outcome literal compare",
    regex: /(?:selectedOutcome|currentOutcome|outcome)\s*[!=]==\s*"(?:correct|wrong|skipped)"/g,
  },
  {
    label: "all type-filter literal compare",
    regex: /typeFilter\s*[!=]==\s*"all"/g,
  },
  {
    label: "all srs-filter literal compare",
    regex: /srsFilter\s*[!=]==\s*"all"/g,
  },
  {
    label: "queueMode literal compare",
    regex: /queueMode\s*[!=]==\s*"(?:review|lesson)"/g,
  },
  {
    label: "type filter all literal setter",
    regex: /setTypeFilter\("all"\)/g,
  },
  {
    label: "srs filter all literal setter",
    regex: /setSrsFilter\("all"\)/g,
  },
  {
    label: "viewer mode literal setter",
    regex: /setViewerMode\("(?:detail|flash)"\)/g,
  },
  {
    label: "submit outcome literal arg",
    regex: /onSubmit\([^\n]*"(?:correct|wrong)"/g,
  },
  {
    label: "skipped outcome literal map assignment",
    regex: /\[assignmentId\]:\s*"skipped"/g,
  },
];

function walk(dirPath, results) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, results);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (![...includeExtensions].some((ext) => entry.name.endsWith(ext))) {
      continue;
    }

    const relPath = relative(repoRoot, entryPath).split("\\").join("/");
    if (excludedRelativePaths.has(relPath)) {
      continue;
    }

    const isTargetLibFile = /\/lib\/(studyExplorer|useStudy)[^/]*\.ts$/.test(relPath);
    const isTargetComponentFile =
      /src\/app\/users\/\[nickname\]\/study-explorer\/components\/.*\.tsx$/.test(relPath);

    if (!isTargetLibFile && !isTargetComponentFile) {
      continue;
    }

    results.push({ relPath, absPath: entryPath });
  }
}

const files = [];
walk(targetRoot, files);

const violations = [];
for (const file of files) {
  const content = readFileSync(file.absPath, "utf8");
  for (const pattern of forbiddenPatterns) {
    for (const match of content.matchAll(pattern.regex)) {
      const idx = match.index ?? 0;
      const line = content.slice(0, idx).split("\n").length;
      violations.push({
        file: file.relPath,
        line,
        label: pattern.label,
        snippet: match[0],
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Study magic-string check failed.");
  console.error("Use studyExplorerDomain constants/predicates instead of direct literal comparisons.");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.label}] ${violation.snippet}`);
  }
  process.exit(1);
}

console.log(`Study magic-string check passed: ${files.length} files scanned.`);
