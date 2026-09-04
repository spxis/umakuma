import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { UK_STUDY_ANSWER_ROW, UK_STUDY_PAGE } from "./ukStudyPage";

const SESSION = "src/app/users/[nickname]/uk-study/UkStudySession.tsx";

describe("the UmaKuma sitting", () => {
  it("answers with the site's own row, not a third way", () => {
    /* The site already had two established ways to answer: the review row -
       Wrong / Skip / Correct, with its keyboard shortcuts and tallies - and
       the Corners board's two, three or four tiles. A hand-rolled pair of
       buttons here made a third, on a site whose whole convention is one
       reusable style per job. */
    const source = readFileSync(SESSION, "utf8");
    expect(source).toContain(UK_STUDY_ANSWER_ROW);
    expect(source).not.toContain('"I knew it"');
  });

  it("keeps a running tally, the way the row expects", () => {
    const source = readFileSync(SESSION, "utf8");
    for (const field of ["wrong", "skipped", "correct"]) {
      expect(source, field).toContain(`${field}={tally.${field}}`);
    }
  });

  it("skips without writing, so a passed item keeps its stage", () => {
    /* Skip is not an answer. Recording it as one would move the item's
       interval on evidence the member explicitly declined to give. */
    const source = readFileSync(SESSION, "utf8");
    const skip = source.slice(source.indexOf("function skip()"), source.indexOf("async function answer"));
    expect(skip).not.toContain("fetch(");
  });

  it("sits in the Study nav, at the path the page is served from", () => {
    const nav = readFileSync("src/app/shared/navSections.ts", "utf8");
    expect(nav).toContain("UK_STUDY_PAGE.path");
    expect(UK_STUDY_PAGE.path).toBe("uk-study");
  });
});
