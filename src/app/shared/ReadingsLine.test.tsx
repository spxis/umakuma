import { readFileSync } from "node:fs";
import { join } from "node:path";

import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { READING_KINDS } from "@/lib/domainConstants";

import ReadingsLine from "./ReadingsLine";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

/**
 * One kind of reading, labelled in both languages, written in the right script.
 *
 * "On readings" alone teaches nothing; the label a student is tested on is
 * 音読み, so it is beside the English every time, and the readings under it
 * are in the script that kind takes.
 */
describe("a line of readings", () => {
  const doc = render(<ReadingsLine kind={READING_KINDS.on} readings={["すい", "ミ.ズ"]} />);
  const text = doc.body.textContent ?? "";

  it("labels the kind in English and in Japanese", () => {
    expect(text).toContain("On readings");
    expect(text).toContain("音読み");
    expect(doc.querySelector('[title="on\'yomi"]')).not.toBeNull();
  });

  it("writes on readings in katakana, without the markers", () => {
    expect(text).toContain("スイ");
    expect(text).toContain("ミズ");
    expect(text).not.toContain("すい");
  });

  /* For the reader still weak in kana; hidden on a phone, where the kana are what fits. */
  it("puts the romaji beside each reading, and lets a phone drop it", () => {
    const romaji = [...doc.querySelectorAll("span")].filter((el) => el.textContent === "sui" || el.textContent === "mizu");
    expect(romaji).toHaveLength(2);
    expect(romaji.every((el) => el.className.includes("hidden") && el.className.includes("sm:inline"))).toBe(true);
  });

  it("leaves the romaji out where a surface has no room", () => {
    const quiet = render(<ReadingsLine kind={READING_KINDS.kun} readings={["みず"]} showRomaji={false} />);
    expect(quiet.body.textContent).not.toContain("mizu");
  });

  it("draws nothing for a kind the character has no readings of", () => {
    expect(renderToStaticMarkup(<ReadingsLine kind={READING_KINDS.nanori} readings={[]} />)).toBe("");
  });
});

/*
 * Every surface that labels readings goes through the line, so the label
 * cannot be spelled two ways and the script cannot differ between pages.
 */
describe("the surfaces that label readings", () => {
  it.each([
    ["the dictionary block", "src/app/kanji/[character]/KanjiDictionaryDetail.tsx"],
    ["the grade cards", "src/app/users/[nickname]/grades/GradeKanjiGrid.tsx"],
    ["the JLPT detail", "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerDetailSection.tsx"],
  ])("draw %s through the shared line", (_label, path) => {
    expect(read(path)).toContain("ReadingsLine");
  });

  it("names the kinds from the domain map, never a local string", () => {
    for (const path of [
      "src/app/kanji/[character]/KanjiPage.constants.ts",
      "src/app/users/[nickname]/grades/GradeExplorer.constants.ts",
      "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerDetailSection.tsx",
    ]) {
      expect(read(path), path).not.toMatch(/"(On|Kun|Name) readings"|>Onyomi<|>Kunyomi</);
    }
  });

  it("writes the grade list's lanes in their own scripts", () => {
    const rows = read("src/app/users/[nickname]/grades/GradeKanjiRows.tsx");
    expect(rows).toContain("formatReading(READING_KINDS.on");
    expect(rows).toContain("formatReading(READING_KINDS.kun");
  });
});
