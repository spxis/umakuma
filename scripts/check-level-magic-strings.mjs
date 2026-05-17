import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const targetRoot = join(repoRoot, "src", "app", "users", "[nickname]", "level-explorer");

const includeExtensions = new Set([".ts", ".tsx"]);
const excludedRelativePaths = new Set([
  "src/app/users/[nickname]/level-explorer/lib/levelExplorerDomain.ts",
  "src/app/users/[nickname]/level-explorer/lib/levelExplorerState.ts",
]);

const forbiddenPatterns = [
  {
    label: "subjectType literal compare",
    regex: /subjectType\s*[!=]==\s*"(?:radical|kanji|vocabulary)"/g,
  },
  {
    label: "status literal compare",
    regex: /status\s*[!=]==\s*"(?:locked|apprentice|guru|master|enlightened|burned)"/g,
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
    label: "all jlpt-filter literal compare",
    regex: /jlptFilter\s*[!=]==\s*"all"/g,
  },
  {
    label: "all review-timing literal compare",
    regex: /reviewTimingFilter\s*[!=]==\s*"all"/g,
  },
  {
    label: "review timing literal compare",
    regex: /reviewTimingFilter\s*[!=]==\s*"(?:overdue|next1h|next8h|next24h|next72h)"/g,
  },
  {
    label: "type filter literal setter",
    regex: /setTypeFilter(?:AndEnsureVisible)?\("(?:all|radical|kanji|vocabulary)"\)/g,
  },
  {
    label: "srs filter literal setter",
    regex: /setSrsFilter\("(?:all|apprentice|guru|master|enlightened|burned|locked)"\)/g,
  },
  {
    label: "jlpt filter literal setter",
    regex: /setJlptFilter\("(?:all|none|n1|n2|n3|n4|n5)"\)/g,
  },
  {
    label: "review timing literal setter",
    regex: /setReviewTimingFilter\("(?:all|overdue|next1h|next8h|next24h|next72h)"\)/g,
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

    const isTargetLibFile = /\/lib\/levelExplorer[^/]*\.ts$/.test(relPath);
    const isTargetComponentFile =
      /src\/app\/users\/\[nickname\]\/level-explorer\/components\/.*\.tsx$/.test(relPath);

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
  console.error("Level magic-string check failed.");
  console.error("Use levelExplorerDomain/levelExplorerState constants and predicates instead of direct literal comparisons.");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.label}] ${violation.snippet}`);
  }
  process.exit(1);
}

console.log(`Level magic-string check passed: ${files.length} files scanned.`);
