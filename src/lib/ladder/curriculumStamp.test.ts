import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { GRADE_CURRICULUM_VERSION } from "@/lib/gradeLadder";
import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";

import { curriculumStampText, curriculumVersionFor } from "./curriculumStamp";
import { LADDER_STREAMS } from "./ladderStreams";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * Every figure names the curriculum it was drawn from.
 *
 * `AGENTS.md` requires it, and the reason is reproducibility: both ladders are
 * rebuilt when the evidence says to - 95 kanji changed level between UN 1.0.0
 * and 2.0.0, and 12 did on UG at 2.0.0 - so a chart without a version is a
 * number nobody can check, and the version is what tells a reader whether the
 * picture still matches what a member is being taught.
 */
describe("the curriculum stamp", () => {
  it("takes each stream's version from its own ladder file", () => {
    expect(curriculumVersionFor(LADDER_STREAMS.un)).toBe(CURRICULUM_VERSION);
    expect(curriculumVersionFor(LADDER_STREAMS.ug)).toBe(GRADE_CURRICULUM_VERSION);
  });

  /* Two constants, and picking the wrong one is silent - which is why the
     surfaces ask this rather than pairing a stream with a version themselves. */
  it("does not hand one ladder's version to the other", () => {
    const un = curriculumVersionFor(LADDER_STREAMS.un);
    const ug = curriculumVersionFor(LADDER_STREAMS.ug);
    expect(curriculumStampText(LADDER_STREAMS.un)).toBe(`UN ${un}`);
    expect(curriculumStampText(LADDER_STREAMS.ug)).toBe(`UG ${ug}`);
  });

  it("writes it the way AGENTS.md spells it", () => {
    expect(curriculumStampText(LADDER_STREAMS.un)).toMatch(/^UN \d+\.\d+\.\d+$/);
    expect(curriculumStampText(LADDER_STREAMS.ug)).toMatch(/^UG \d+\.\d+\.\d+$/);
  });
});

/*
 * The surfaces drawn from a ladder carry it. Asserted over the sources rather
 * than by rendering, because the point is that no *new* ladder surface goes
 * out without one.
 */
describe("the surfaces drawn from a ladder are stamped", () => {
  it.each([
    ["src/app/users/[nickname]/umakuma/UmakumaLevelBoard.tsx", "LADDER_STREAMS.un"],
    ["src/app/users/[nickname]/grades/GradeKanjiBoard.tsx", "LADDER_STREAMS.ug"],
    ["src/app/users/[nickname]/uk-study/UkStudySession.tsx", "stream={stream}"],
  ])("%s carries the stamp", (path, stream) => {
    const source = read(path);
    expect(source).toContain("CurriculumStamp");
    expect(source).toContain(stream);
  });

  /*
   * Faint on purpose, as John asked: "keep it so that you can barely see it."
   *
   * Asserted as a declaration rather than as a class name. The contrast gate
   * holds muted text to 4.5:1 and this sits deliberately under it, so what
   * matters is that the exemption is written down with its reason - and
   * naming the class here would put the literal in a second file for that
   * gate to find.
   */
  it("is declared faint on purpose, with its reason", () => {
    const gate = read("src/lib/textContrast.test.ts");
    expect(gate).toContain('"src/app/shared/CurriculumStamp.tsx"');
    expect(gate).toContain("barely see it");
  });
});
