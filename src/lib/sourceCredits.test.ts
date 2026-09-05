import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SOURCE_CREDITS, SOURCE_CREDIT_COPY } from "./sourceCredits";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * Saying whose work it is.
 *
 * Three of the four borrowed sources were credited and the largest was not:
 * Tatoeba's sentences, KanjiVG's strokes and KANJIDIC2's facts each named their
 * source, while WaniKani's meanings, readings and mnemonics named nobody. Each
 * credit was also its own paragraph in its own file, which is three chances for
 * one of them to drift out of a licence condition.
 */

describe("who gets credited", () => {
  it("names every borrowed source", () => {
    expect(Object.keys(SOURCE_CREDITS).sort()).toEqual([
      "curriculum",
      "jiten",
      "jmdict",
      "jpmap",
      "kanjiConfusion",
      "kanjiapi",
      "kanjidic2",
      "kanjivg",
      "radkfile",
      "tatoeba",
      "usmap",
      "wanikani",
      "worldmap",
    ]);
    for (const credit of Object.values(SOURCE_CREDITS)) {
      expect(credit.source.length).toBeGreaterThan(1);
      expect(credit.url).toMatch(/^https?:\/\//);
    }
  });

  /*
   * CC BY makes Tatoeba's credit a licence condition rather than a courtesy,
   * so the licence and its URL are asserted rather than assumed.
   */
  it("carries Tatoeba's licence, which is a condition of using it", () => {
    expect(SOURCE_CREDITS.tatoeba.licence).toContain("CC BY");
    expect(SOURCE_CREDITS.tatoeba.licenceUrl).toContain("creativecommons.org");
  });

  /*
   * WaniKani's content is theirs under their own terms, not under a public
   * licence. Naming one would claim a grant they have not made.
   */
  it("claims no licence for a source that granted none", () => {
    expect(SOURCE_CREDITS.wanikani).not.toHaveProperty("licence");
    expect(SOURCE_CREDITS.wanikani.url).toContain("wanikani.com");
  });

  /*
   * kanjiapi.dev serves EDRDG data whose share-alike terms already sit on the
   * dictionary block. Naming a licence here would claim the same grant twice.
   */
  it("names the compounds API without restating the dictionary licence", () => {
    expect(SOURCE_CREDITS.kanjiapi).not.toHaveProperty("licence");
    expect(SOURCE_CREDITS.kanjiapi.url).toContain("kanjiapi.dev");
  });

  /*
   * The map outlines went uncredited from the day Map mode shipped, and Japan's
   * were the one borrowing on the site actually in breach: GSI ask to be named
   * and ask that edits be declared, and the board did neither. The prefecture
   * shapes are reprojected, simplified and Okinawa is lifted into a box, so
   * "edited" is a statement of fact rather than a hedge.
   */
  it("names GSI for the prefecture outlines, under the terms that compel it", () => {
    expect(SOURCE_CREDITS.jpmap.source).toContain("GSI");
    expect(SOURCE_CREDITS.jpmap.licenceUrl).toContain("gsi.go.jp");
    expect(SOURCE_CREDIT_COPY.mapOutlines).toContain("edited");
  });

  /*
   * A work of the US government and a public-domain dataset granted nothing,
   * so neither may be shown as having licensed anything - the same rule that
   * keeps WaniKani from appearing to have granted a licence.
   */
  it("claims no licence for the two maps that are public domain", () => {
    expect(SOURCE_CREDITS.usmap).not.toHaveProperty("licence");
    expect(SOURCE_CREDITS.worldmap).not.toHaveProperty("licence");
    expect(SOURCE_CREDITS.usmap.url).toContain("census.gov");
    expect(SOURCE_CREDITS.worldmap.url).toContain("naturalearthdata.com");
  });
});

describe("where the credit is drawn", () => {
  const CREDIT = "src/app/shared/SourceCredit.tsx";

  it.each([
    ["the sentences", "src/app/shared/ExampleSentences.tsx"],
    ["the stroke drawings", "src/app/shared/KanjiStrokeAnimation.tsx"],
    ["the dictionary facts", "src/app/kanji/[character]/KanjiDictionaryDetail.tsx"],
    ["the public subject card", "src/app/shared/subject-page/SubjectIdentityBlock.tsx"],
    ["the explorer detail panel", "src/app/users/[nickname]/level-explorer/components/LevelExplorerDetailSection.tsx"],
  ])("draws %s credit with the shared component", (_label, path) => {
    const source = read(path);
    /* Directly, or through the block shell that places it at the foot. */
    expect(source).toMatch(/SourceCredit|SubjectBlock/);
    /* And never its own copy of the paragraph. */
    expect(source).not.toMatch(/href=\{[a-zA-Z.]*attribution\.licenceUrl\}/);
  });

  /*
   * One style for a section's credit: the rule across the full width, centred,
   * small. The stroke-order panel had it first; every other section drew its
   * own left-aligned line at its own size, and the page read as five products.
   * Only the stroke animation may draw inline - it has no edge of its own.
   */
  it("puts every section's credit at the foot, the same way", () => {
    const inline = ["src/app/shared/ExampleSentences.tsx", "src/app/kanji/[character]/KanjiDictionaryDetail.tsx",
      "src/app/shared/subject-page/SubjectIdentityBlock.tsx", "src/app/shared/KanjiDetailModal.tsx",
      "src/app/shared/subject-page/SubjectBlock.tsx"].filter((path) => read(path).includes('variant="inline"'));
    expect(inline).toEqual([]);
    expect(read("src/app/shared/KanjiStrokeAnimation.tsx")).toContain('variant="inline"');
    expect(read(CREDIT)).toContain("border-t border-line px-5 py-2 text-center");
  });

  it("says what was taken, not only who it came from", () => {
    expect(read("src/app/shared/subject-page/SubjectIdentityBlock.tsx")).toContain("SOURCE_CREDIT_COPY.subjectData");
    /* The mnemonic credit moved into the block that draws the mnemonics. */
    expect(read("src/app/shared/subject-page/MnemonicsBlock.tsx")).toContain("SOURCE_CREDIT_COPY.mnemonics");
    expect(read("src/app/shared/subject-page/UsedInWordsBlock.tsx")).toContain("SOURCE_CREDIT_COPY.words");
    for (const label of Object.values(SOURCE_CREDIT_COPY)) expect(label).toMatch(/from$/);
  });

  /* Every credit link leaves the site, so every credit link says so. */
  it("sends the name to our page and only the licence off the site", () => {
    const credit = read(CREDIT);
    expect(credit).toContain("sourcePath(source)");
    expect(credit.split('target="_blank"').length - 1).toBe(1);
    expect(credit).toContain('rel="noreferrer noopener"');
  });

  /*
   * The credit used to live beside the sentence loader, which is `server-only`
   * because it reaches for Prisma - so a client component that wanted it
   * dragged the database client into the browser bundle and the build refused.
   * A string and a URL belong where both halves can read them.
   */
  it("keeps the credits importable from a client component", () => {
    const lib = read("src/lib/sourceCredits.ts");
    expect(lib).not.toMatch(/^import /m);
  });
});
