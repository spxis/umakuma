import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  SUBJECT_SECTIONS,
  kanjiPageHref,
  parseSubjectSection,
  subjectSectionHref,
} from "./subjectSectionAddress";
import { filingStripIndex } from "./subjectSectionLayout";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("the address of one part of a character", () => {
  it("reads the whole character when no part is named", () => {
    expect(parseSubjectSection(undefined)).toBeNull();
    expect(parseSubjectSection([])).toBeNull();
    /* Next hands a trailing slash through as an empty segment. */
    expect(parseSubjectSection([""])).toBeNull();
  });

  it("reads a part the page has", () => {
    expect(parseSubjectSection(["stroke"])).toBe(SUBJECT_SECTIONS.stroke);
    expect(parseSubjectSection(["words"])).toBe(SUBJECT_SECTIONS.words);
  });

  /*
   * A wrong address is a 404, not the whole page: a broken link that renders
   * something looks like a working one, and nobody goes back to fix it.
   */
  it("refuses a segment that names nothing, and refuses two", () => {
    expect(parseSubjectSection(["nonsense"])).toBe("invalid");
    expect(parseSubjectSection(["stroke", "extra"])).toBe("invalid");
    expect(parseSubjectSection(["Stroke"])).toBe("invalid");
  });

  it("builds the address of a subject and of one of its parts", () => {
    const kanji = kanjiPageHref("魔");
    expect(kanji).toBe(`/kanji/${encodeURIComponent("魔")}`);
    expect(subjectSectionHref(kanji, SUBJECT_SECTIONS.stroke)).toBe(`${kanji}/stroke`);
    /* The subject is escaped by whoever named it; the section never needs to be. */
    expect(subjectSectionHref(kanji, SUBJECT_SECTIONS.words)).not.toContain("%2F");
    expect(subjectSectionHref("/radicals/leaf", SUBJECT_SECTIONS.related)).toBe("/radicals/leaf/related");
    expect(subjectSectionHref("/radicals/leaf")).toBe("/radicals/leaf");
  });
});

/*
 * One list per page type, drawn by the whole page and by a section page alike.
 * Two lists is how `/kanji/魔` and `/kanji/魔/stroke` would come to disagree
 * about what a character has.
 */
describe("the blocks a subject is made of", () => {
  const registries: Record<string, string> = {
    kanji: "src/app/kanji/[character]/kanjiSections.tsx",
    subject: "src/app/shared/subject-page/subjectSections.tsx",
  };
  const idsIn = (path: string) =>
    [...read(path).matchAll(/id: SUBJECT_SECTIONS\.(\w+)/g)].map((match) => match[1]!);

  it.each(Object.entries(registries))("declares every section of the %s page once", (_name, path) => {
    const ids = idsIn(path);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(Object.keys(SUBJECT_SECTIONS)).toContain(id);
  });

  /* Both name the same parts, so a segment learned on one page works on the next. */
  it("shares one vocabulary across the page types", () => {
    for (const id of idsIn(registries.subject!)) {
      expect(idsIn(registries.kanji!)).toContain(id);
    }
  });

  /* An empty block is left out of the page and is not an address of its own. */
  it.each([
    "src/app/kanji/[character]/[[...section]]/page.tsx",
    "src/app/radicals/[slug]/[[...section]]/page.tsx",
    "src/app/vocabulary/[word]/[[...section]]/page.tsx",
  ])("%s answers 404 for a part the subject has nothing under", (path) => {
    expect(read(path)).toContain("if (shown.length === 0)");
  });
});

/*
 * Sixty thousand pages holding a fraction of the page they belong to is the
 * shape a search engine reads as padding. These addresses are for sending to
 * somebody, so the subject's own page is named as the real one.
 */
describe("what a section page tells a search engine", () => {
  it.each([
    ["kanji", "src/app/kanji/[character]/[[...section]]/page.tsx", "kanjiPageHref(character)"],
    ["radical", "src/app/radicals/[slug]/[[...section]]/page.tsx", "radicalHref(slug)"],
    ["word", "src/app/vocabulary/[word]/[[...section]]/page.tsx", "wordHref(word)"],
  ])("names the whole %s as the page of record", (_name, path, href) => {
    expect(read(path)).toContain(`alternates: { canonical: ${href} }`);
  });

  it("still answers with the section's own title, so a shared link previews as what was shared", () => {
    const page = read("src/app/kanji/[character]/[[...section]]/page.tsx");
    expect(page).toContain("title: `${character} · ${title}`");
  });
});

/*
 * The strip that files a subject onto a list belongs to the subject, not to a
 * block, and each page had already settled on where it sits.
 */
describe("where the filing strip lands", () => {
  const kanji = ["stroke", "meanings", "words", "related", "mnemonics", "examples"] as const;
  const subject = ["meanings", "mnemonics", "related", "examples"] as const;

  it("stays under the drawing on a kanji page", () => {
    expect(filingStripIndex([...kanji], [...kanji], "stroke")).toBe(0);
  });

  /* Above the sentences on a word page, which is where it has always been. */
  it("stays above the sentences on a word page", () => {
    expect(filingStripIndex([...subject], [...subject], "related")).toBe(2);
  });

  /* A subject with no related group still keeps the strip above its sentences. */
  it("moves up to the last block before it when that block is missing", () => {
    expect(filingStripIndex(["meanings", "examples"], [...subject], "related")).toBe(0);
  });

  /* A section page shows one block, so the strip goes under that one. */
  it("sits under the only block a section page draws", () => {
    expect(filingStripIndex(["examples"], [...subject], "related")).toBe(0);
    expect(filingStripIndex(["mnemonics"], [...kanji], "stroke")).toBe(0);
  });

  it("has nowhere to go when nothing is drawn", () => {
    expect(filingStripIndex([], [...subject], "related")).toBe(-1);
  });
});
