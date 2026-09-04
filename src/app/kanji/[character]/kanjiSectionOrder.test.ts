import { describe, expect, it } from "vitest";

import { SUBJECT_SECTIONS } from "@/app/shared/subject-page/subjectSectionAddress";

import { KANJI_SECTION_BLOCKS } from "./kanjiSections";

const order = KANJI_SECTION_BLOCKS.map((block) => block.id);
const at = (id: string) => order.indexOf(id as (typeof order)[number]);

/*
 * John: Written with has radicals only, and probably should be next to the
 * WaniKani Related section. Both answer the same question from different
 * books - RADKFILE lists the shapes, WaniKani's Built from lists the radicals
 * it teaches - and they were a scroll apart.
 */
describe("the order a kanji page reads in", () => {
  it("puts Written with immediately before Related", () => {
    expect(at(SUBJECT_SECTIONS.parts) + 1).toBe(at(SUBJECT_SECTIONS.related));
  });

  /* The character first, then what it means, then where it is used. */
  it("still opens on the strokes and keeps the reading order after them", () => {
    expect(order[0]).toBe(SUBJECT_SECTIONS.stroke);
    expect(at(SUBJECT_SECTIONS.meanings)).toBeLessThan(at(SUBJECT_SECTIONS.words));
    expect(at(SUBJECT_SECTIONS.words)).toBeLessThan(at(SUBJECT_SECTIONS.parts));
  });

  /* Somebody's writing and borrowed sentences come last, as they did. */
  it("leaves the mnemonics and the sentences at the end", () => {
    expect(order.at(-2)).toBe(SUBJECT_SECTIONS.mnemonics);
    expect(order.at(-1)).toBe(SUBJECT_SECTIONS.examples);
  });

  it("lists every section exactly once", () => {
    expect(new Set(order).size).toBe(order.length);
  });
});
