import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { gradeEntryHit } from "@/app/users/[nickname]/grades/gradeExplorerView";
import { jlptKanjiHit } from "@/app/users/[nickname]/jlpt-explorer/lib/jlptRowAdapter";
import { canList, canTag, itemOf, levelItemHit } from "@/lib/subjectFiler";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * Filing reached search, the subject pages and the glyph viewer, and not the
 * four explorer grids - which is where somebody actually is when they decide a
 * kanji is worth keeping.
 */
describe("what an explorer row can be filed as", () => {
  /* A WaniKani subject: a real catalogue id, so it can be tagged as well as listed. */
  it("keeps the catalogue id on a queue item", () => {
    const hit = levelItemHit({ subjectId: 440, subjectType: "kanji", characters: "水" });
    expect(hit.subjectId).toBe(440);
    expect(canTag(hit)).toBe(true);
    expect(canList(hit)).toBe(true);
    expect(itemOf(hit)).toEqual({ kind: "kanji", key: "水", subjectId: 440 });
  });

  /*
   * The school and JLPT catalogues are not WaniKani's. A character from either
   * goes on a saved list, which names kanji by the character; trouble and
   * favourite are held against a WaniKani subject and there is not one.
   */
  it.each([
    ["a school grade kanji", gradeEntryHit({ kanji: "山" } as Parameters<typeof gradeEntryHit>[0])],
    ["a JLPT kanji", jlptKanjiHit({ kanji: "山" })],
  ])("lists %s without pretending it can be tagged", (_name, hit) => {
    expect(canList(hit)).toBe(true);
    expect(canTag(hit)).toBe(false);
    expect(itemOf(hit)).toEqual({ kind: "kanji", key: "山", subjectId: null });
  });

  /* Module-level functions: the hits they build decide when the filer refetches. */
  it.each([
    ["src/app/users/[nickname]/grades/gradeExplorerView.ts", "export function gradeEntryHit"],
    ["src/app/users/[nickname]/jlpt-explorer/lib/jlptRowAdapter.ts", "export function jlptKanjiHit"],
    ["src/lib/subjectFiler.ts", "export function levelItemHit"],
  ])("declares %s at the top level so its identity is stable", (path, declaration) => {
    expect(read(path)).toContain(declaration);
  });
});

describe("the four explorers", () => {
  const surfaces: Array<[string, string]> = [
    ["grades", "src/app/users/[nickname]/grades/GradeKanjiBoard.tsx"],
    ["JLPT", "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerContent.tsx"],
    ["study", "src/app/users/[nickname]/study-explorer/components/StudyExplorerPanel.tsx"],
    ["level", "src/app/users/[nickname]/level-explorer/components/LevelExplorerItemsGrid.tsx"],
  ];

  it.each(surfaces)("wires %s through the one hook", (_name, path) => {
    const source = read(path);
    expect(source).toContain("useExplorerFiling");
    /* The control that opens the marks, or a member cannot reach them at all. */
    expect(source).toContain("filing.toggle");
  });

  /*
   * A surface whose cards already draw trouble and favourite inside the glyph
   * asks for lists only. Two sets of the same two buttons a few centimetres
   * apart is a question about whether they mean the same thing.
   */
  it.each([
    "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerContent.tsx",
    "src/app/users/[nickname]/study-explorer/components/StudyExplorerPanel.tsx",
    "src/app/users/[nickname]/level-explorer/components/LevelExplorerItemsGrid.tsx",
  ])("%s draws lists only, since it already has the tag marks", (path) => {
    expect(read(path)).toContain('"lists"');
  });

  /*
   * The grades explorer has no tag marks of its own - a school kanji has no
   * WaniKani subject to hold one - so it offers everything the cell can draw.
   */
  it("lets the grades explorer offer every mark it can", () => {
    expect(read("src/app/users/[nickname]/grades/GradeKanjiBoard.tsx")).not.toContain('"lists"');
  });

  /* Nobody to file for means no control: a visitor is offered nothing. */
  it("offers no toggle without an account", () => {
    expect(read("src/app/shared/useExplorerFiling.tsx")).toContain("accountId ? (");
  });
});
