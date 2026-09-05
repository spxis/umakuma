import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const DIR = "src/app/users/[nickname]/study-explorer/components";

describe("a radical is not asked for a reading", () => {
  const pane = readFileSync(`${DIR}/StudyReviewAnswerPane.tsx`, "utf8");
  const section = readFileSync(`${DIR}/StudyReviewModalSection.tsx`, "utf8");

  /* John: "radicals don't have reading and meaning... just meaning. realize
     one field is always blank." It was the first panel on the card, and for
     every radical it held a dash. */
  it("draws no reading panel when there is no reading", () => {
    expect(pane).toContain("hasReading ? (");
    expect(pane).toContain("hasReading: boolean;");
  });

  it("decides it by the subject type, not by an empty string", () => {
    expect(section).toContain("hasReading={!isRadicalSubjectType(selectedItem.subjectType)}");
  });

  /* Without the reading above it, the meaning is the top of the card and the
     rule that separated the two would be a line under nothing. */
  it("drops the divider that separated the two panels", () => {
    expect(pane).toContain('hasReading ? "mt-3 border-t border-line/70 pt-3" : ""');
  });

  it("still draws both scripts for a subject that has a reading", () => {
    expect(pane).toContain("primaryReadingKatakana");
  });
});

describe("nowhere on the site is a radical asked for a reading", () => {
  /* John: "don't show both for radicals ANYWHERE in the site." A sweep, not a
     fix to one card - each surface that labels a reading either asks the
     subject type or asks whether there are any readings to draw. */
  const guarded: [string, string][] = [
    /* The answer card, which was the one that drew a dash. */
    [`${DIR}/StudyReviewAnswerPane.tsx`, "hasReading ? ("],
    /* The panels under it. */
    [`${DIR}/StudyReviewModalMetaPanels.tsx`, "isRadicalSubjectType(selectedItem.subjectType)"],
    /* The level explorer answers null rather than a dash for a radical. */
    [
      "src/app/users/[nickname]/level-explorer/lib/levelExplorerDisplayReadings.tsx",
      "isRadicalSubjectType(item.subjectType)",
    ],
    /* A subject's own page draws the block only when there is something in it. */
    ["src/app/shared/subject-page/SubjectIdentityBlock.tsx", "readings.length > 0"],
  ];

  it.each(guarded)("%s guards its reading", (file, guard) => {
    expect(readFileSync(file, "utf8")).toContain(guard);
  });

  /* The review card asks the same predicate every other surface asks, rather
     than comparing the subject type to a literal of its own. */
  it("asks the one shared predicate", () => {
    expect(readFileSync(`${DIR}/StudyReviewModalSection.tsx`, "utf8")).toContain(
      "hasReading={!isRadicalSubjectType(selectedItem.subjectType)}",
    );
  });
});
