import { describe, expect, it } from "vitest";

import { UK_SUBJECT_ID_BASE } from "./ukSubjectIdentity";
import { ukOnlyTaggedSubject } from "./ukTaggedSubjects";

describe("a tagged subject only our ladder teaches", () => {
  it("resolves under its reserved identity with the row's own facts and no WaniKani level", () => {
    const subject = ukOnlyTaggedSubject({ id: 9100, kind: "kanji", characters: "𠮷", meanings: ["good luck"], readings: ["きち"], nLevel: null });
    expect(subject).toEqual({
      subjectId: UK_SUBJECT_ID_BASE + 9100,
      subjectType: "kanji",
      wkLevel: null,
      characters: "𠮷",
      meanings: ["good luck"],
      readings: ["きち"],
      primaryReadings: ["きち"],
      jlptLevel: null,
    });
  });

  it("reads an unknown kind as a kanji, the way the feed does", () => {
    expect(ukOnlyTaggedSubject({ id: 1, kind: "?", characters: "x", meanings: [], readings: [], nLevel: 5 }).subjectType).toBe("kanji");
  });
});
