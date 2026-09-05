import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { UK_STUDY_PAGE } from "./ukStudyPage";

const SESSION = "src/app/users/[nickname]/uk-study/UkStudySession.tsx";

describe("the UmaKuma sitting", () => {
  it("hands the sitting to the Study explorer, fed from our ladder", () => {
    /* One review interface for every feed. The page drew its own card and
       answer row for a release; that was a second way to sit a review on a
       site whose convention is one reusable style per job. Now the page keeps
       what is ours alone - level, gate, import, numbers - and the sitting is
       the explorer's, over the UK queue. */
    const source = readFileSync(SESSION, "utf8");
    expect(source).not.toContain("StudyReviewFlashActionRow");
    expect(source).toContain("href={studyHref}");
    const page = readFileSync("src/app/users/[nickname]/uk-study/page.tsx", "utf8");
    /* The route is `study`; `study-explorer` is the component folder and 404s. */
    expect(page).toContain("study?source=umakuma");
    const queue = readFileSync("src/app/api/uk-study/[accountId]/queue/route.ts", "utf8");
    expect(queue).toContain("mapUkQueueItem");
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
