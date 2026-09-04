import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import ladder from "@/data/kanjiLadder.json";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { LADDER_LEVELS_PER_PAGE } from "@/lib/ladder/ladderQuery";

import { UK_EXPLORER_PAGE } from "./umakumaExplorerPage";

const HERE = "src/app/users/[nickname]/umakuma-explorer";

/**
 * The explorer is a browsing surface over the built curriculum, so what is
 * worth testing is that it cannot quietly disagree with the ladder it reads
 * from, and that it does not carry the ladder to the browser.
 */
describe("UmaKuma Explorer", () => {
  it("is in the Learn nav, at the path the page is served from", () => {
    const nav = readFileSync("src/app/shared/navSections.ts", "utf8");
    expect(nav).toContain("UK_EXPLORER_PAGE.path");
    expect(UK_EXPLORER_PAGE.path).toBe("umakuma-explorer");
  });

  it("pages the whole ladder — no level is unreachable", () => {
    const pages = Math.ceil(KANJI_LADDER_LEVELS / LADDER_LEVELS_PER_PAGE);
    expect(pages * LADDER_LEVELS_PER_PAGE).toBeGreaterThanOrEqual(KANJI_LADDER_LEVELS);
    expect((pages - 1) * LADDER_LEVELS_PER_PAGE).toBeLessThan(KANJI_LADDER_LEVELS);
  });

  it("never imports the built ladder into a client component", () => {
    /* 351 KB. A static import anywhere in this folder's client tree would put
       the whole curriculum in the bundle of a page most members open to read
       two levels of it — which is the reason the explorer fetches. */
    for (const file of ["UmakumaExplorer.tsx", "UmakumaLevelCard.tsx"]) {
      const source = readFileSync(`${HERE}/${file}`, "utf8");
      expect(source, file).toContain('"use client"');
      expect(source, file).not.toContain("data/kanjiLadder");
    }
  });

  it("renders the page on request, because CI builds without a database", () => {
    /* The crosswalk asks Prisma for WaniKani's words. A page that tried to
       prerender would fail the build with no DATABASE_URL — the repo has hit
       this before. */
    expect(readFileSync(`${HERE}/page.tsx`, "utf8")).toContain('export const dynamic = "force-dynamic"');
  });

  it("promises radicals before the kanji built from them, which is what it draws", () => {
    /* The card draws radicals, then kanji, then words, in that order. That is
       only honest if the ladder itself keeps the promise, so assert the
       property rather than the markup: no level teaches a kanji before a level
       that teaches one of its radicals. */
    const firstKanjiLevel = Math.min(
      ...Object.values(ladder.kanjiLevel as Record<string, { level: number }>).map((entry) => entry.level),
    );
    const firstRadicalLevel = Math.min(...Object.values(ladder.radicalLevel as Record<string, number>));
    expect(firstRadicalLevel).toBeLessThan(firstKanjiLevel);
  });

  it("keeps its copy out of the components", () => {
    const source = readFileSync(`${HERE}/UmakumaExplorer.tsx`, "utf8");
    expect(source).toContain("UmakumaExplorer.constants");
  });
});

describe("searching the ladder", () => {
  it("asks the rows view, which spans all hundred levels", () => {
    /* The level view is paged ten at a time. A search that used it would only
       ever find what is on the open page, which is the bug this asserts
       against — a member looking for 語 must be told level 10, not "not on
       this page". */
    const source = readFileSync(`${HERE}/UmakumaExplorer.tsx`, "utf8");
    expect(source).toContain('view: "rows"');
    expect(source).toContain("search: needle");
  });

  it("groups hits by the level that teaches them", () => {
    /* A search result that showed only the character has told a member
       nothing the kanji's own page would not. The level is the answer. */
    const source = readFileSync(`${HERE}/UmakumaSearchResults.tsx`, "utf8");
    expect(source).toContain("row.ukLevel");
    expect(source).toContain("copy.levelLabel");
  });

  it("clears on Escape before it closes, per the repo's rule", () => {
    const source = readFileSync(`${HERE}/UmakumaExplorer.tsx`, "utf8");
    expect(source).toContain('if (event.key !== "Escape") return;');
    expect(source).toContain("if (search) setSearch(\"\");");
  });

  it("jumps to the page holding a level, for all hundred of them", () => {
    const source = readFileSync(`${HERE}/UmakumaExplorer.tsx`, "utf8");
    expect(source).toContain("LEVELS_PER_PAGE) + 1");
    expect(source).toContain("max={initial.ladderLevels}");
  });
});
