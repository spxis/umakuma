import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { toUkHistoryRow, ukHistoryLevels, type UkHistoryAttempt } from "./ukStudyHistoryRows";

const subject = {
  kind: "kanji",
  characters: "身",
  level: 12,
  ugLevel: 31,
  wkSubjectId: null,
  nLevel: 3,
  meanings: ["Body", "Somebody"],
  readings: ["しん", "み"],
  meaningMnemonic: null,
  readingMnemonic: "A reading story.",
};

/* What the 8,896 WaniKani-taught rows look like: the facts live in the catalogue. */
const taught = { ...subject, wkSubjectId: 689, meanings: [], readings: [], readingMnemonic: null };
const catalogue = {
  characters: "身",
  meanings: ["Body"],
  readings: ["しん", "み"],
  primaryReadings: ["しん"],
  radicals: [{ subjectId: 1, subjectType: "radical" as const, label: "自", characters: "自", slug: "self", meaning: "Self", reading: null, wkLevel: 1 }],
  visuallySimilar: [],
  usedInVocabulary: [],
  componentKanji: [],
  jlptLevel: 2,
  jlptMeta: null,
};

function attempt(overrides: Partial<UkHistoryAttempt> = {}): UkHistoryAttempt {
  return {
    id: "attempt-1",
    accountId: "acct",
    stateId: 1075,
    subjectId: 8252,
    result: "wrong",
    newSrsStage: 6,
    submittedAt: new Date("2026-09-07T16:28:06.788Z"),
    curriculumStream: LADDER_STREAMS.un,
    state: {
      srsStage: 6,
      startedAt: new Date("2026-08-01T00:00:00Z"),
      passedAt: null,
      availableAt: new Date("2026-09-09T00:00:00Z"),
      subject,
    },
    ...overrides,
  };
}

describe("ukHistoryLevels", () => {
  it("fills only the ladder the answer was given on", () => {
    expect(ukHistoryLevels(LADDER_STREAMS.un, subject)).toEqual({ unLevel: 12, ugLevel: null });
    expect(ukHistoryLevels(LADDER_STREAMS.ug, subject)).toEqual({ unLevel: null, ugLevel: 31 });
  });

  it("reads an unstamped attempt as UN, which every one of them was", () => {
    expect(ukHistoryLevels(null, subject)).toEqual({ unLevel: 12, ugLevel: null });
  });
});

describe("toUkHistoryRow", () => {
  const member = { nickname: "John", wkUsername: "johnmorrisdotca" };

  it("draws the subject, the stage the answer left it at, and no WaniKani level", () => {
    const row = toUkHistoryRow(attempt(), member);
    expect(row).toMatchObject({
      id: "attempt-1",
      nickname: "John",
      assignmentId: 8252,
      subjectId: 8252,
      subjectType: "kanji",
      result: "wrong",
      submittedAt: "2026-09-07T16:28:06.788Z",
      subjectLabel: "身",
      subjectReading: "しん",
      subjectMeaning: "Body",
      wkLevel: null,
      unLevel: 12,
      ugLevel: null,
      srsStage: 6,
      srsBucket: "guru",
    });
    expect(row.subjectData).toMatchObject({
      characters: "身",
      primaryReadings: ["しん"],
      readingExplanation: "A reading story.",
      jlptLevel: 3,
      availableAt: "2026-09-09T00:00:00.000Z",
      srsStage: 6,
    });
  });

  it("falls back to the state's stage when the attempt recorded none", () => {
    const row = toUkHistoryRow(attempt({ newSrsStage: null, state: { ...attempt().state, srsStage: 2 } }), member);
    expect(row.srsStage).toBe(2);
    expect(row.srsBucket).toBe("apprentice");
  });

  it("reads a WaniKani-taught subject from the catalogue, without its mnemonics", () => {
    const row = toUkHistoryRow(attempt({ state: { ...attempt().state, subject: taught } }), member, catalogue);
    expect(row.subjectLabel).toBe("身");
    expect(row.subjectReading).toBe("しん");
    expect(row.subjectMeaning).toBe("Body");
    expect(row.subjectData).toMatchObject({ primaryReadings: ["しん"], jlptLevel: 2, radicals: [{ label: "自" }] });
    expect(row.subjectData?.meaningExplanation).toBeUndefined();
  });

  it("draws a dash rather than inventing content when the catalogue is silent", () => {
    const row = toUkHistoryRow(attempt({ state: { ...attempt().state, subject: taught } }), member);
    expect(row.subjectLabel).toBe("身");
    expect(row.subjectReading).toBeNull();
    expect(row.subjectMeaning).toBeNull();
  });

  it("keeps a UG answer on the UG ladder", () => {
    const row = toUkHistoryRow(attempt({ curriculumStream: LADDER_STREAMS.ug }), member);
    expect(row.unLevel).toBeNull();
    expect(row.ugLevel).toBe(31);
  });
});
