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
    expect(Object.keys(SOURCE_CREDITS).sort()).toEqual(["tatoeba", "wanikani"]);
    for (const credit of Object.values(SOURCE_CREDITS)) {
      expect(credit.source.length).toBeGreaterThan(1);
      expect(credit.url).toMatch(/^https:\/\//);
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
});

describe("where the credit is drawn", () => {
  const CREDIT = "src/app/shared/SourceCredit.tsx";

  it.each([
    ["the sentences", "src/app/shared/ExampleSentences.tsx"],
    ["the stroke drawings", "src/app/shared/KanjiStrokeAnimation.tsx"],
    ["the dictionary facts", "src/app/kanji/[character]/KanjiDictionaryDetail.tsx"],
    ["the public subject panel", "src/app/shared/SubjectDetailPanel.tsx"],
    ["the explorer detail panel", "src/app/users/[nickname]/level-explorer/components/LevelExplorerDetailSection.tsx"],
  ])("draws %s credit with the shared component", (_label, path) => {
    const source = read(path);
    expect(source).toContain("SourceCredit");
    /* And never its own copy of the paragraph. */
    expect(source).not.toMatch(/href=\{[a-zA-Z.]*attribution\.licenceUrl\}/);
  });

  it("says what was taken, not only who it came from", () => {
    const panel = read("src/app/shared/SubjectDetailPanel.tsx");
    expect(panel).toContain("SOURCE_CREDIT_COPY.subjectData");
    expect(panel).toContain("SOURCE_CREDIT_COPY.mnemonics");
    expect(SOURCE_CREDIT_COPY.subjectData).toMatch(/from$/);
  });

  /* Every credit link leaves the site, so every credit link says so. */
  it("opens each source in a new tab", () => {
    const credit = read(CREDIT);
    expect(credit.split('target="_blank"').length - 1).toBe(2);
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
