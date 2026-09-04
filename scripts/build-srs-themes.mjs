import fs from "node:fs/promises";
import path from "node:path";

import { EXTRA_THEMES } from "./srs-theme-extras.mjs";
import {
  RUNG_REPLACEMENTS,
  SHORT_OVERRIDES,
  THEME_RATINGS,
  THEME_RATING_DEFAULT,
  THEME_RENAMES,
} from "./srs-theme-meta.mjs";

/**
 * Builds `src/data/srsThemes.json`, the committed source for SRS themes.
 *
 * Run once against the brainstorm markdown; after that the JSON is the source
 * of truth and the markdown is disposable. Every field the site needs is in
 * the output — a title safe to ship, an age rating, a chip-sized name for
 * every rung, and a level 0 for "not started" that the brainstorm had no row
 * for.
 */

const SOURCE = process.argv[2] ?? path.join(process.env.HOME ?? "", "Downloads/uk-srs-themes.md");
const OUTPUT = path.resolve("src/data/srsThemes.json");

/** How long a chip may be before it stops fitting a pill. */
const SHORT_MAX = 5;

const DROPPABLE = [
  "魔法使い", "ハンター", "ヒーロー", "捜査官", "呪術師", "パイロット", "賞金稼ぎ",
  "カウボーイ", "ボクサー", "チャンピオン", "アーティスト", "エージェント", "コング",
  "ウォークマン", "探窟家", "オーディオ", "テイマー", "ビルダー", "ランナー",
];

/** A rung's chip: hand-written where trimming would lose the word. */
function shortOf(term) {
  const override = SHORT_OVERRIDES[term];
  if (override) return override;
  const chars = [...term];
  if (chars.length <= SHORT_MAX) return term;
  for (const suffix of DROPPABLE) {
    if (term.endsWith(suffix) && [...term.slice(0, -suffix.length)].length > 0) {
      const trimmed = term.slice(0, -suffix.length);
      if ([...trimmed].length <= SHORT_MAX) return trimmed;
    }
  }
  return chars.slice(0, SHORT_MAX).join("");
}

function levelsIn(spec) {
  const range = /^(\d)\s*[–-]\s*(\d)$/.exec(spec.trim());
  if (range) {
    const [, low, high] = range;
    return Array.from({ length: Number(high) - Number(low) + 1 }, (_, i) => Number(low) + i);
  }
  const single = /^(\d)$/.exec(spec.trim());
  return single ? [Number(single[1])] : [];
}

const cells = (line) => line.split("|").slice(1, -1).map((cell) => cell.trim());
const isDivider = (line) => /^\|[\s:|-]+\|$/.test(line.trim());
/* The parenthetical stays: two themes are called Shinkansen and differ only
   by it, and a slug that drops it silently collides. */
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/\*\*|\[[^\]]*\]/g, "")
    /* Macrons are letters, not punctuation: without this, Bōsōzoku slugs to
       `b-s-zoku` and Mizushōbai to `mizush-bai`, which no rating map matches. */
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const raw = await fs.readFile(SOURCE, "utf8");
const parsed = [];
let current = null;
let table = null;

for (const line of raw.split("\n")) {
  const heading = /^## (.+)$/.exec(line);
  if (heading) {
    const title = heading[1].replace(/\s*\*\*.*$/, "").replace(/\s+—.*$/, "").trim();
    current = { id: slug(title), sourceName: title, buckets: [], levels: [] };
    parsed.push(current);
    table = null;
    continue;
  }
  if (!current) continue;
  if (/^\*\*Buckets\*\*/.test(line)) { table = "buckets"; continue; }
  if (/^\*\*Levels\*\*/.test(line)) { table = "levels"; continue; }
  if (!line.startsWith("|") || isDivider(line)) continue;

  const row = cells(line);
  if (table === "buckets" && /^\d$/.test(row[0])) {
    current.buckets.push({ term: row[1], reading: row[2], meaning: row[3], levels: levelsIn(row[4] ?? "") });
  }
  if (table === "levels" && /^\d$/.test(row[0])) {
    /* Strip the italic asides the source uses for character notes. */
    const meaning = (row[3] ?? "").replace(/\s*\*\([^)]*\)\*\s*$/, "").replace(/\[cite:[^\]]*\]/g, "").trim();
    current.levels.push({ level: Number(row[0]), term: row[1], reading: row[2], meaning });
  }
}

const ratingOf = (id) =>
  THEME_RATINGS.adult.includes(id) ? "adult" : THEME_RATINGS.teen.includes(id) ? "teen" : THEME_RATING_DEFAULT;

const themes = parsed
  .filter((theme) => theme.levels.length === 9)
  .map((theme) => {
    const bucketOf = new Map();
    for (const bucket of theme.buckets) for (const level of bucket.levels) bucketOf.set(level, bucket);
    const swaps = RUNG_REPLACEMENTS[theme.id] ?? {};

    const levels = theme.levels.map((entry) => {
      const swap = swaps[entry.level];
      const term = swap?.term ?? entry.term;
      const reading = swap?.reading ?? entry.reading;
      /* `??` will not fall through an empty string, and the source leaves
         some meanings blank (the ten stems), so this must be `||`. */
      const meaning = swap?.meaning || entry.meaning || bucketOf.get(entry.level)?.meaning || "";
      const bucket = bucketOf.get(entry.level);
      return {
        level: entry.level,
        term,
        reading,
        meaning,
        short: shortOf(term),
        bucket: bucket?.term ?? "",
        bucketReading: bucket?.reading ?? "",
        bucketMeaning: bucket?.meaning ?? "",
      };
    });

    /* Level 0 is "not started" — the brainstorm has no row for it, and every
       theme needs one because a locked item has to say something. */
    levels.unshift({
      level: 0,
      term: "未着手",
      reading: "Michakushu",
      meaning: "Not started",
      short: "未",
      bucket: "未着手",
      bucketReading: "Michakushu",
      bucketMeaning: "Not started",
    });

    return {
      id: theme.id,
      name: THEME_RENAMES[theme.id] ?? theme.sourceName,
      /* Kept so a rename can be checked against what it replaced. */
      sourceName: theme.sourceName,
      renamed: Boolean(THEME_RENAMES[theme.id]),
      rating: ratingOf(theme.id),
      levels,
    };
  });

/* Authored themes join the parsed ones, through the same shaping. */
for (const extra of EXTRA_THEMES) {
  const levels = extra.levels.map(([term, reading, meaning, bucketIndex], index) => {
    const bucket = extra.buckets[bucketIndex];
    return {
      level: index + 1,
      term,
      reading,
      meaning,
      short: shortOf(term),
      bucket: bucket.term,
      bucketReading: bucket.reading,
      bucketMeaning: bucket.meaning,
    };
  });
  const zero = extra.zero ?? { term: "未着手", reading: "Michakushu", meaning: "Not started", short: "未" };
  levels.unshift({
    level: 0,
    ...zero,
    bucket: zero.term,
    bucketReading: zero.reading,
    bucketMeaning: zero.meaning,
  });
  themes.push({
    id: extra.id,
    name: extra.name,
    sourceName: extra.sourceName,
    renamed: false,
    rating: extra.rating,
    levels,
  });
}

themes.sort((left, right) => left.name.localeCompare(right.name));

await fs.writeFile(
  OUTPUT,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), themes }, null, 2)}\n`,
  "utf8",
);

const counts = { all: 0, teen: 0, adult: 0 };
let longShorts = 0;
for (const theme of themes) {
  counts[theme.rating] += 1;
  for (const level of theme.levels) if ([...level.short].length > SHORT_MAX) longShorts += 1;
}

console.log(`Wrote ${OUTPUT}`);
console.log(`  ${themes.length} themes, ${themes.reduce((s, t) => s + t.levels.length, 0)} rows (10 each, level 0-9)`);
console.log(`  renamed for trademark: ${themes.filter((t) => t.renamed).length}`);
console.log(`  rung swaps applied: ${Object.values(RUNG_REPLACEMENTS).reduce((s, r) => s + Object.keys(r).length, 0)}`);
console.log(`  ratings: all ${counts.all}, teen ${counts.teen}, adult ${counts.adult}`);
console.log(`  chips still over ${SHORT_MAX} characters: ${longShorts}`);
