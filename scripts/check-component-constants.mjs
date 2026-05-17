import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "src");

function walk(dirPath, output) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith(".constants.ts")) {
      output.push(entryPath);
    }
  }
}

if (!statSync(srcRoot, { throwIfNoEntry: false })) {
  console.log("constants check skipped: src/ not found");
  process.exit(0);
}

const constantsFiles = [];
walk(srcRoot, constantsFiles);

const groupedByComponentsDir = new Map();
for (const filePath of constantsFiles) {
  const relPath = relative(repoRoot, filePath);
  const parts = relPath.split(sep);
  const componentsIndex = parts.lastIndexOf("components");
  if (componentsIndex === -1) {
    continue;
  }

  const componentsDir = parts.slice(0, componentsIndex + 1).join("/");
  const existing = groupedByComponentsDir.get(componentsDir) ?? [];
  existing.push(relPath.split(sep).join("/"));
  groupedByComponentsDir.set(componentsDir, existing);
}

const violations = [];
for (const [componentsDir, files] of groupedByComponentsDir.entries()) {
  if (files.length > 1) {
    violations.push({ componentsDir, files: files.sort() });
  }
}

if (violations.length > 0) {
  console.error("Component constants check failed.");
  console.error("Use one shared *.constants.ts file per components/ folder.");
  for (const violation of violations) {
    console.error(`- ${violation.componentsDir}:`);
    for (const file of violation.files) {
      console.error(`  - ${file}`);
    }
  }
  process.exit(1);
}

console.log(`Component constants check passed: ${groupedByComponentsDir.size} component folder(s) scanned.`);
