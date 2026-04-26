import fs from "node:fs/promises";
import path from "node:path";

const JLPT_READINGS_PATH = path.resolve("src/data/jlptReadings.json");
const OUTPUT_PATH = path.resolve("src/data/kanjiLevels.json");
const CONCURRENCY = 8;
const RETRIES = 4;
const BASE_DELAY_MS = 220;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(task, label) {
  let attempt = 0;
  while (attempt < RETRIES) {
    try {
      return await task();
    } catch (error) {
      attempt += 1;
      if (attempt >= RETRIES) {
        throw new Error(`${label} failed after ${RETRIES} attempts: ${String(error)}`);
      }
      await sleep(BASE_DELAY_MS * attempt * attempt);
    }
  }

  throw new Error(`${label} failed unexpectedly.`);
}

async function fetchKanjiGrade(kanji) {
  const response = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = await response.json();
  return typeof payload?.grade === "number" ? payload.grade : null;
}

async function runPool(items, worker, concurrency) {
  const results = new Map();
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      const value = await worker(current);
      results.set(current, value);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
  return results;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(JLPT_READINGS_PATH, "utf8"));
  const kanji = Object.keys(raw).filter((char) => typeof char === "string" && char.length > 0);

  console.log(`Fetching school grades for ${kanji.length} kanji...`);

  const gradeMap = await runPool(
    kanji,
    async (char) =>
      await withRetry(
        async () => await fetchKanjiGrade(char),
        `Grade lookup ${char}`,
      ),
    CONCURRENCY,
  );

  const out = {};
  for (const char of kanji) {
    out[char] = {
      schoolGrade: gradeMap.get(char) ?? null,
    };
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(`Wrote ${Object.keys(out).length} entries to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
