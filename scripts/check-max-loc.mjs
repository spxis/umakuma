import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MAX_LINES = Number(process.env.MAX_FILE_LINES ?? "500");
const SOURCE_ROOT = path.join(ROOT, "src");
const INCLUDE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css"]);
const IGNORE_DIRS = new Set([".git", ".next", "node_modules", "dist", "build", "coverage"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        files.push(...(await walk(fullPath)));
      }
      continue;
    }

    if (entry.isFile() && INCLUDE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function lineCount(filePath) {
  const content = await readFile(filePath, "utf8");
  if (content.length === 0) {
    return 0;
  }

  return content.split(/\r?\n/).length;
}

async function main() {
  const sourceStat = await stat(SOURCE_ROOT).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    console.error("LOC check failed: src directory not found.");
    process.exit(1);
  }

  const files = await walk(SOURCE_ROOT);
  const violations = [];

  for (const filePath of files) {
    const lines = await lineCount(filePath);
    if (lines > MAX_LINES) {
      violations.push({ filePath, lines });
    }
  }

  if (violations.length > 0) {
    console.error(`LOC check failed: ${violations.length} file(s) exceed ${MAX_LINES} lines.`);
    for (const violation of violations.sort((a, b) => b.lines - a.lines)) {
      const relative = path.relative(ROOT, violation.filePath);
      console.error(`- ${relative}: ${violation.lines}`);
    }
    process.exit(1);
  }

  console.log(`LOC check passed: ${files.length} files <= ${MAX_LINES} lines.`);
}

void main();
