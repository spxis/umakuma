import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SOURCE_KEY_VALUES, SOURCE_KEYS, type SourceKey } from "./sourceCredits";
import { resolveShowcase, SHOWCASE_DEFAULTS, SHOWCASE_MAX_ROWS, showcaseSettingKey } from "./sourceShowcase";

const readJson = (path: string) => JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));

describe("the rows a source shows", () => {
  it("has picks for every source, within the limit and filled in", () => {
    for (const key of SOURCE_KEY_VALUES) {
      const rows = SHOWCASE_DEFAULTS[key];
      expect(rows, `${key} has no chosen rows`).toBeTruthy();
      expect(rows.length, key).toBeGreaterThan(0);
      expect(rows.length, key).toBeLessThanOrEqual(SHOWCASE_MAX_ROWS);
      for (const row of rows) {
        expect(row.specimen.length, key).toBeGreaterThan(0);
        expect(row.detail.length, key).toBeGreaterThan(0);
      }
    }
  });

  it("keys an override by source, so two sources cannot share one row set", () => {
    const keys = SOURCE_KEY_VALUES.map(showcaseSettingKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(showcaseSettingKey(SOURCE_KEYS.jmdict)).toBe("sources:showcase:jmdict");
  });

  it("shows an admin's picks in place of the defaults", () => {
    const stored = JSON.stringify([{ specimen: "犬", detail: "dog", note: "chosen by hand" }]);
    expect(resolveShowcase(SOURCE_KEYS.kanjidic2, stored)).toEqual([
      { specimen: "犬", detail: "dog", note: "chosen by hand" },
    ]);
  });

  it("takes no more rows than the limit, however many were stored", () => {
    const many = Array.from({ length: SHOWCASE_MAX_ROWS + 3 }, (_, index) => ({
      specimen: `x${index}`,
      detail: "d",
    }));
    expect(resolveShowcase(SOURCE_KEYS.tatoeba, JSON.stringify(many))).toHaveLength(SHOWCASE_MAX_ROWS);
  });

  /*
   * The stored value is written by an admin through a form and read on a public
   * page, so it is never trusted: anything that has lost its shape falls back
   * rather than drawing half a card or throwing on a page nobody can then fix.
   */
  it.each([
    ["nothing stored", null],
    ["empty", ""],
    ["not JSON", "{oh dear"],
    ["not a list", '{"specimen":"犬"}'],
    ["an empty list", "[]"],
    ["rows with no specimen", '[{"detail":"dog"}]'],
    ["rows with a blank specimen", '[{"specimen":"","detail":"dog"}]'],
    ["a note that is not text", '[{"specimen":"犬","detail":"dog","note":7}]'],
  ])("falls back to the chosen rows when the stored value is %s", (_label, stored) => {
    expect(resolveShowcase(SOURCE_KEYS.radkfile, stored)).toEqual(SHOWCASE_DEFAULTS[SOURCE_KEYS.radkfile]);
  });
});

/**
 * The rows quote real numbers, so the numbers are checked against the data.
 *
 * A showcase is worse than no showcase when it is wrong: it is the one part of
 * an accreditation page that looks like evidence. Checking the first draft
 * against these same files caught seven false claims - 口 in 1,443 characters
 * rather than 1,337, 鬱 at WaniKani level 60 when it is 50, 父 held out as a
 * word print rarely uses when it sits in the top band - and every one of them
 * would have shipped. A corpus rebuild moves these figures, so the check has to
 * live here rather than in somebody's memory of having looked once.
 */
describe("the numbers in the rows are the numbers in the data", () => {
  const detailFor = (key: SourceKey, specimen: string) => {
    const row = SHOWCASE_DEFAULTS[key].find((entry) => entry.specimen === specimen);
    expect(row, `${key} no longer shows ${specimen}`).toBeTruthy();
    return `${row?.detail} ${row?.note ?? ""}`;
  };

  it("counts the characters a radical is written into", () => {
    const { radicals } = readJson("src/data/radicals/index.json");
    for (const [glyph, strokes, kanji] of [
      ["口", 3, 1337],
      ["龠", 17, 3],
    ] as const) {
      const entry = radicals.find((r: { radical: string }) => r.radical === glyph);
      expect(entry.strokes, glyph).toBe(strokes);
      expect([...entry.kanji].length, glyph).toBe(kanji);
      expect(detailFor(SOURCE_KEYS.radkfile, glyph)).toContain(kanji.toLocaleString("en-CA"));
    }
  });

  const kanjidic = (() => {
    const dir = "src/data/kanjidic";
    const index: Record<string, { grade: number | null; strokeCount: number; frequencyRank: number | null; readings: { on: string[] } }> = {};
    for (const file of readdirSync(join(process.cwd(), dir))) {
      if (file === "index.json") continue;
      for (const k of readJson(join(dir, file)).kanji) index[k.kanji] = k;
    }
    return index;
  })();

  it("says 鬱 is the most complex character in common use, and unranked", () => {
    expect(kanjidic["鬱"].strokeCount).toBe(29);
    expect(kanjidic["鬱"].frequencyRank).toBeNull();
    const joyo = Object.values(kanjidic).filter((k) => k.grade !== null && k.grade <= 8);
    expect(Math.max(...joyo.map((k) => k.strokeCount))).toBe(29);
    expect(detailFor(SOURCE_KEYS.kanjidic2, "鬱")).toContain("29 strokes");
  });

  it("says 一 is one stroke and the second commonest in print", () => {
    expect(kanjidic["一"].strokeCount).toBe(1);
    expect(kanjidic["一"].frequencyRank).toBe(2);
    expect(detailFor(SOURCE_KEYS.kanjidic2, "一")).toContain("rank 2");
  });

  it("says 畑 was made in Japan and has no Chinese reading", () => {
    expect(kanjidic["畑"].readings.on).toEqual([]);
    expect(kanjidic["畑"].grade).toBe(3);
    expect(detailFor(SOURCE_KEYS.kanjidic2, "畑")).toContain("Grade 3");
  });

  it("draws the strokes it claims to draw", () => {
    const dir = "src/data/stroke-order";
    const drawn = new Map<string, number>();
    for (const file of readdirSync(join(process.cwd(), dir))) {
      if (file === "index.json") continue;
      for (const k of readJson(join(dir, file)).kanji) drawn.set(k.kanji, k.strokes.length);
    }
    for (const glyph of ["永", "凸"]) {
      expect(drawn.get(glyph), glyph).toBe(5);
      expect(detailFor(SOURCE_KEYS.kanjivg, glyph)).toContain("5 strokes");
    }
  });

  it("puts each exam kanji at the level the readings file gives it", () => {
    const jlpt = readJson("src/data/jlptReadings.json");
    expect(jlpt["水"].nLevel).toBe(5);
    expect(jlpt["鑑"].nLevel).toBe(1);
    expect(detailFor(SOURCE_KEYS.kanjiapi, "水")).toContain("N5");
    expect(detailFor(SOURCE_KEYS.kanjiapi, "鑑")).toContain("N1");
  });

  it("puts each school kanji in the year the curriculum gives it", () => {
    const levels = readJson("src/data/kanjiLevels.json");
    expect(levels["一"].schoolGrade).toBe(1);
    expect(levels["亀"].category.code).toBe("secondary");
    expect(kanjidic["亀"].frequencyRank).toBe(1353);
    expect(detailFor(SOURCE_KEYS.curriculum, "亀")).toContain("1,353");
  });

  const borders = (file: string, name: string) => {
    const { regions } = readJson(`src/data/maps/${file}`);
    const region = regions.find((r: { name?: string; romaji?: string }) => r.name === name || r.romaji === name);
    expect(region, name).toBeTruthy();
    return (region.neighbors ?? []).length;
  };

  it.each([
    [SOURCE_KEYS.jpmap, "jp-map.json", "Nagano", "長野県", 8],
    [SOURCE_KEYS.jpmap, "jp-map.json", "Okinawa", "沖縄県", 0],
    [SOURCE_KEYS.usmap, "us-map.json", "Tennessee", "Tennessee", 8],
    [SOURCE_KEYS.usmap, "us-map.json", "Alaska", "Alaska", 0],
    [SOURCE_KEYS.worldmap, "ca-map.json", "Prince Edward Island", "Prince Edward Island", 0],
  ] as const)("counts %s's borders on the map it is drawn from", (key, file, name, specimen, count) => {
    expect(borders(file, name)).toBe(count);
    const said = detailFor(key, specimen).toLowerCase();
    expect(said).toContain(count === 0 ? "no land borders" : `${count} land borders`);
  });

  it("names the most and least finely divided of the thirty Natural Earth countries", () => {
    const readdir = readdirSync(join(process.cwd(), "src/data/maps"));
    const drawn = readdir
      .filter((file) => file.endsWith("-map.json") && !/^(jp|us)-/.test(file))
      .map((file) => {
        const map = readJson(`src/data/maps/${file}`);
        return { name: map.countryName as string, regions: (map.regions as unknown[]).length };
      })
      .sort((left, right) => right.regions - left.regions);

    /* Japan and the States come from GSI and the Census, not from here. */
    expect(drawn).toHaveLength(30);
    const said = SHOWCASE_DEFAULTS[SOURCE_KEYS.worldmap];
    expect(said[0].specimen).toBe(drawn[0].name);
    expect(said[0].detail).toContain(`${drawn[0].regions} divisions`);
    expect(said[1].specimen).toBe(drawn[drawn.length - 1].name);
    expect(said[1].detail).toContain(`${drawn[drawn.length - 1].regions} divisions`);
  });

  it("has Nagano touching more prefectures than any other, and Tennessee tied", () => {
    const jp = readJson("src/data/maps/jp-map.json").regions as { romaji: string; neighbors?: unknown[] }[];
    const most = Math.max(...jp.map((r) => (r.neighbors ?? []).length));
    expect(jp.filter((r) => (r.neighbors ?? []).length === most).map((r) => r.romaji)).toEqual(["Nagano"]);

    const us = readJson("src/data/maps/us-map.json").regions as { name: string; neighbors?: unknown[] }[];
    const usMost = Math.max(...us.map((r) => (r.neighbors ?? []).length));
    expect(us.filter((r) => (r.neighbors ?? []).length === usMost).map((r) => r.name).sort()).toEqual([
      "Missouri",
      "Tennessee",
    ]);
  });

  const catalog = (() => {
    const dir = "src/data/wk-catalog-levels";
    const kanji = new Map<string, number>();
    const word = new Map<string, number>();
    for (const file of readJson(join(dir, "index.json")).files as string[]) {
      const level = readJson(join(dir, file));
      for (const s of level.kanji ?? []) if (s.characters && !s.hiddenAt) kanji.set(s.characters, level.level);
      for (const s of level.vocabulary ?? []) if (s.characters && !s.hiddenAt) word.set(s.characters, s.wkSubjectId);
    }
    return { kanji, word };
  })();

  it.each([
    ["力", 1],
    ["曜", 16],
    ["鬱", 50],
  ] as const)("puts %s on the WaniKani level their catalogue puts it on", (glyph, level) => {
    expect(catalog.kanji.get(glyph)).toBe(level);
    expect(detailFor(SOURCE_KEYS.wanikani, glyph)).toContain(`Level ${level}`);
  });

  /*
   * The newspaper ranks are band midpoints, 500 words to a band, so a row says
   * "band 12 of 48" rather than "rank 5,750" - which would read as a precision
   * JMdict does not publish.
   */
  const frequency = readJson("src/data/wordFrequency.json") as {
    detail: Record<string, { newspaper: number | null; anime: number | null }>;
  };
  const band = (rank: number) => (rank - 250) / 500 + 1;
  const wordDetail = (word: string) => {
    const id = catalog.word.get(word);
    expect(id, `${word} is not a word we teach`).toBeTruthy();
    return frequency.detail[String(id)];
  };

  it.each([
    [SOURCE_KEYS.jmdict, "新聞", 1],
    [SOURCE_KEYS.jmdict, "閣議", 2],
    [SOURCE_KEYS.jiten, "俺", 12],
    [SOURCE_KEYS.jiten, "悪い", 48],
  ] as const)("puts %s's %s in the newspaper band the corpus puts it in", (key, word, expected) => {
    const rank = wordDetail(word).newspaper;
    expect(rank, word).not.toBeNull();
    expect(band(rank as number), word).toBe(expected);
    expect(detailFor(key, word).toLowerCase(), word).toContain(`band ${expected}`);
  });

  it.each([
    [SOURCE_KEYS.jmdict, "閣議", 58336],
    [SOURCE_KEYS.jiten, "俺", 67],
    [SOURCE_KEYS.jiten, "悪い", 132],
  ] as const)("quotes %s's %s at the anime rank the corpus gives it", (key, word, expected) => {
    expect(wordDetail(word).anime, word).toBe(expected);
    expect(detailFor(key, word)).toContain(expected.toLocaleString("en-CA"));
  });
});
