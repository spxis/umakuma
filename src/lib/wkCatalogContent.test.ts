import { describe, expect, it } from "vitest";

import {
  catalogContentEquals,
  jsonDeepEquals,
  type CatalogContentFields,
} from "./wkCatalogContent";

function row(overrides: Partial<CatalogContentFields> = {}): CatalogContentFields {
  return {
    object: "kanji",
    subjectType: "kanji",
    level: 5,
    slug: "水",
    characters: "水",
    documentUrl: "https://www.wanikani.com/kanji/水",
    hiddenAt: null,
    meanings: [{ meaning: "Water", primary: true, accepted_answer: true }],
    readings: [{ reading: "すい", primary: true, type: "onyomi" }],
    componentSubjectIds: [1],
    amalgamationSubjectIds: [10, 11],
    visuallySimilarSubjectIds: [],
    meaningMnemonic: "A droplet.",
    meaningHint: null,
    readingMnemonic: "Sui.",
    readingHint: null,
    ...overrides,
  };
}

describe("jsonDeepEquals", () => {
  it("matches structurally regardless of key order", () => {
    expect(jsonDeepEquals({ a: 1, b: [2, 3] }, { b: [2, 3], a: 1 })).toBe(true);
  });

  it("distinguishes array order, which is meaning order", () => {
    expect(jsonDeepEquals([{ m: "a" }, { m: "b" }], [{ m: "b" }, { m: "a" }])).toBe(false);
  });

  it("distinguishes null, missing and false", () => {
    expect(jsonDeepEquals({ a: null }, {})).toBe(false);
    expect(jsonDeepEquals(null, false)).toBe(false);
    expect(jsonDeepEquals(null, null)).toBe(true);
  });

  it("handles nested structures", () => {
    expect(jsonDeepEquals([{ a: { b: [1, 2] } }], [{ a: { b: [1, 2] } }])).toBe(true);
    expect(jsonDeepEquals([{ a: { b: [1, 2] } }], [{ a: { b: [1, 3] } }])).toBe(false);
  });
});

describe("catalogContentEquals", () => {
  it("treats identical rows as equal", () => {
    expect(catalogContentEquals(row(), row())).toBe(true);
  });

  it("is equal even when meanings JSON differs only in key order", () => {
    const existing = row({ meanings: [{ meaning: "Water", primary: true }] });
    const next = row({ meanings: [{ primary: true, meaning: "Water" }] });
    expect(catalogContentEquals(existing, next)).toBe(true);
  });

  it("catches a changed meaning", () => {
    expect(
      catalogContentEquals(row(), row({ meanings: [{ meaning: "Liquid", primary: true }] })),
    ).toBe(false);
  });

  it("catches a level move", () => {
    expect(catalogContentEquals(row(), row({ level: 6 }))).toBe(false);
  });

  it("catches a subject being hidden", () => {
    expect(catalogContentEquals(row(), row({ hiddenAt: new Date("2026-08-01T00:00:00Z") }))).toBe(
      false,
    );
  });

  it("treats equal hidden dates as equal", () => {
    const at = "2026-08-01T00:00:00Z";
    expect(
      catalogContentEquals(row({ hiddenAt: new Date(at) }), row({ hiddenAt: new Date(at) })),
    ).toBe(true);
  });

  it("catches a changed relation list", () => {
    expect(catalogContentEquals(row(), row({ amalgamationSubjectIds: [10] }))).toBe(false);
    expect(catalogContentEquals(row(), row({ componentSubjectIds: [2] }))).toBe(false);
  });

  it("catches a mnemonic edit", () => {
    expect(catalogContentEquals(row(), row({ readingMnemonic: "Swim." }))).toBe(false);
  });

  it("catches null-to-value transitions", () => {
    expect(catalogContentEquals(row(), row({ meaningHint: "hint" }))).toBe(false);
    expect(catalogContentEquals(row({ readings: null }), row())).toBe(false);
    expect(catalogContentEquals(row({ readings: null }), row({ readings: null }))).toBe(true);
  });
});
