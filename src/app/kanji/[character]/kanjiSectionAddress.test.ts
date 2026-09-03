import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  KANJI_SECTIONS,
  KANJI_SECTION_ORDER,
  kanjiSectionHref,
  parseKanjiSection,
} from "./kanjiSectionAddress";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("the address of one part of a character", () => {
  it("reads the whole character when no part is named", () => {
    expect(parseKanjiSection(undefined)).toBeNull();
    expect(parseKanjiSection([])).toBeNull();
    /* Next hands a trailing slash through as an empty segment. */
    expect(parseKanjiSection([""])).toBeNull();
  });

  it("reads a part the page has", () => {
    expect(parseKanjiSection(["stroke"])).toBe(KANJI_SECTIONS.stroke);
    expect(parseKanjiSection(["words"])).toBe(KANJI_SECTIONS.words);
  });

  /*
   * A wrong address is a 404, not the whole page: a broken link that renders
   * something looks like a working one, and nobody goes back to fix it.
   */
  it("refuses a segment that names nothing, and refuses two", () => {
    expect(parseKanjiSection(["nonsense"])).toBe("invalid");
    expect(parseKanjiSection(["stroke", "extra"])).toBe("invalid");
    expect(parseKanjiSection(["Stroke"])).toBe("invalid");
  });

  it("builds the address of a character and of one of its parts", () => {
    expect(kanjiSectionHref("魔")).toBe(`/kanji/${encodeURIComponent("魔")}`);
    expect(kanjiSectionHref("魔", KANJI_SECTIONS.stroke)).toBe(`/kanji/${encodeURIComponent("魔")}/stroke`);
    /* The character is escaped; the section never needs to be. */
    expect(kanjiSectionHref("魔", KANJI_SECTIONS.words)).not.toContain("%2F");
  });
});

describe("the blocks a character is made of", () => {
  const registry = () => read("src/app/kanji/[character]/kanjiSections.tsx");

  /*
   * One list, drawn by the whole page and by a section page alike. Two lists
   * is how `/kanji/魔` and `/kanji/魔/stroke` would come to disagree about
   * what a character has.
   */
  it("declares every section exactly once, in page order", () => {
    const ids = [...registry().matchAll(/id: KANJI_SECTIONS\.(\w+)/g)].map((match) => match[1]);
    expect(ids).toEqual([...KANJI_SECTION_ORDER]);
  });

  /* An empty block is left out of the page and is not an address of its own. */
  it("asks each block whether this character has anything under it", () => {
    expect(registry()).toContain("has: (view)");
    expect(read("src/app/kanji/[character]/[[...section]]/page.tsx")).toContain("if (shown.length === 0)");
  });
});

describe("what a section page tells a search engine", () => {
  const page = () => read("src/app/kanji/[character]/[[...section]]/page.tsx");

  /*
   * Sixty thousand pages holding a fraction of the page they belong to is the
   * shape a search engine reads as padding. These addresses are for sending to
   * somebody, so the character's own page is named as the real one.
   */
  it("names the whole character as the page of record", () => {
    expect(page()).toContain("alternates: { canonical: kanjiSectionHref(character) }");
  });

  it("still answers with the section's own title, so a shared link previews as what was shared", () => {
    expect(page()).toContain("title: `${character} · ${title}`");
  });
});
