import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GAME_CURRENCY_TYPES, GAME_CURRENCY_VALUES } from "./gameCurrencyDomain";
import {
  CURRENCY_ASSET_BASE_PATH,
  GAME_CURRENCY_REACTIONS,
  currencyIconPath,
  currencyPngPath,
  currencyReactionPath,
  listCurrencyAssetFiles,
  listCurrencyAssetNames,
} from "./gameCurrencyReactions";

const MASTERS_DIR = path.resolve(__dirname, "../images/currency");
const OUTPUT_DIR = path.resolve(__dirname, "../../public/assets/currency");

const OUTLINE_COLOR = "#4B372B";
const OUTLINE_COLOR_DARK = "#6A5243";

describe("the reaction registry", () => {
  it("names reactions for every currency, and only those", () => {
    expect(Object.keys(GAME_CURRENCY_REACTIONS).sort()).toEqual([...GAME_CURRENCY_VALUES].sort());
  });

  it("gives each mascot the same number of faces", () => {
    const counts = new Set(GAME_CURRENCY_VALUES.map((type) => GAME_CURRENCY_REACTIONS[type].length));
    expect(counts.size).toBe(1);
  });

  it("builds paths the way the build names files", () => {
    expect(currencyIconPath(GAME_CURRENCY_TYPES.mochi)).toBe(`${CURRENCY_ASSET_BASE_PATH}/mochi.svg`);
    expect(currencyIconPath(GAME_CURRENCY_TYPES.oni, { size: 18, dark: true })).toBe(
      `${CURRENCY_ASSET_BASE_PATH}/oni-18-dark.svg`,
    );
    expect(currencyReactionPath(GAME_CURRENCY_TYPES.kane, "party")).toBe(`${CURRENCY_ASSET_BASE_PATH}/kane-party.svg`);
    expect(currencyReactionPath(GAME_CURRENCY_TYPES.mochi, "love", { dark: true })).toBe(
      `${CURRENCY_ASSET_BASE_PATH}/mochi-love-dark.svg`,
    );
    expect(currencyPngPath(GAME_CURRENCY_TYPES.oni, 512, "rocket")).toBe(`${CURRENCY_ASSET_BASE_PATH}/oni-rocket-512.png`);
    expect(currencyPngPath(GAME_CURRENCY_TYPES.kane, 2048)).toBe(`${CURRENCY_ASSET_BASE_PATH}/kane-2048.png`);
  });
});

/*
 * The masters and the built files are checked against the registry in both
 * directions, so a face added to the list without its drawing, a drawing
 * added without being listed, or a build that was not re-run after either,
 * all fail here rather than as a broken image on a page.
 */
describe("the built currency assets", () => {
  const names = listCurrencyAssetNames();

  it("has a master for every mascot and face, and no master that is not listed", () => {
    const masters = readdirSync(MASTERS_DIR)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.replace(/\.svg$/, ""))
      .sort();
    expect(masters).toEqual([...names].sort());
  });

  it("has every file the build writes for every name", () => {
    const missing = names.flatMap((name) =>
      listCurrencyAssetFiles(name).filter((file) => !existsSync(path.join(OUTPUT_DIR, file))),
    );
    expect(missing).toEqual([]);
  });

  it("has nothing in the output directory the build did not write", () => {
    const expected = new Set(names.flatMap((name) => listCurrencyAssetFiles(name)));
    const stray = readdirSync(OUTPUT_DIR).filter((file) => !expected.has(file));
    expect(stray).toEqual([]);
  });

  it("keeps clip ids unique inside every built SVG, so nothing is clipped by a neighbour", () => {
    for (const file of readdirSync(OUTPUT_DIR).filter((name) => name.endsWith(".svg"))) {
      const ids = [...readFileSync(path.join(OUTPUT_DIR, file), "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size, file).toBe(ids.length);
    }
  });

  it("lifts the outline in every dark variant and leaves build annotations out of every file", () => {
    for (const file of readdirSync(OUTPUT_DIR).filter((name) => name.endsWith(".svg"))) {
      const source = readFileSync(path.join(OUTPUT_DIR, file), "utf8");
      expect(source, file).not.toContain("data-min-size");
      if (file.endsWith("-dark.svg")) {
        expect(source, file).not.toContain(OUTLINE_COLOR);
        expect(source, file).toContain(OUTLINE_COLOR_DARK);
      } else {
        expect(source, file).toContain(OUTLINE_COLOR);
      }
    }
  });

  it("thickens the outline at eighteen pixels so a face still reads", () => {
    for (const name of names) {
      const sized = readFileSync(path.join(OUTPUT_DIR, `${name}-18.svg`), "utf8");
      expect(sized, name).toMatch(/<svg[^>]*\swidth="18"/);
      const outline = [...sized.matchAll(new RegExp(`stroke="${OUTLINE_COLOR}" stroke-width="([\\d.]+)"`, "g"))].map((m) =>
        Number(m[1]),
      );
      expect(outline.length, name).toBeGreaterThan(0);
      for (const width of outline) expect(width, name).toBeGreaterThan(7);
    }
  });
});
