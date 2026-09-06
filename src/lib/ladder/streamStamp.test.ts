import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "./ladderStreams";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * An answer is stamped with the ladder it was actually answered against.
 *
 * `AGENTS.md` states the promise: "written at submission from the member's
 * stream and the shipped ladder's version, never defaulted in the schema and
 * never inferred later." It was not. `curriculumStream` was the literal UN in
 * every writer, first because nobody could choose UG and then because nobody
 * revisited it when `Account.ladderStream` shipped in 1.42.0.
 *
 * That is not a label being slightly wrong. UN and UG order the same 2,235
 * kanji differently, so an answer filed under the wrong stream is an answer to
 * a different question - and a board counting those rows cannot tell, which is
 * exactly what the UN and UG leaderboards are about to do.
 *
 * Asserted over the sources because the fault is a constant where a lookup
 * belongs, and a constant passes every runtime test that does not happen to
 * use a UG member.
 */
describe("every writer stamps the member's own stream", () => {
  it.each([
    ["src/lib/uk/ukStudyWrite.ts", "before?.ladderStream"],
    ["src/lib/cohort/cohortStudy.ts", "member.persona.stream"],
  ])("%s reads the stream rather than naming one", (path, expected) => {
    const source = read(path);
    expect(source).toContain(expected);
    expect(source).not.toMatch(/curriculumStream:\s*LADDER_STREAMS\.(un|ug)\b/);
  });

  /* The stamp a member sees has to agree with the stamp that was written, or
     the faint line on the page is a second claim that can disagree with the
     row. It takes the stream as a prop rather than naming one. */
  it("shows the member their own stream on the study page", () => {
    const source = read("src/app/users/[nickname]/uk-study/UkStudySession.tsx");
    expect(source).toContain("<CurriculumStamp stream={stream}");
    expect(source).not.toContain("LADDER_STREAMS.un");
  });

  /* And the page can only pass it because the shell fetches it. */
  it("carries the stream on the shell every member page already loads", () => {
    expect(read("src/app/users/[nickname]/lib/userPageShell.ts")).toContain("ladderStream: true");
  });

  it("still has exactly the two streams", () => {
    expect(Object.values(LADDER_STREAMS)).toEqual(["UN", "UG"]);
  });
});
