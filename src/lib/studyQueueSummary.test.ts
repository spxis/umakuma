import { describe, expect, it } from "vitest";

import { srsTransition, summariseStudyQueue } from "./studyQueueSummary";

describe("one summary for every study feed", () => {
  it("files an item under our level when the feed is ours, else WaniKani's", () => {
    const summary = summariseStudyQueue([
      { subjectType: "kanji", unLevel: 9, wkLevel: 12, srsStage: 5, status: "guru" },
      { subjectType: "vocabulary", wkLevel: 12, srsStage: 1, status: "apprentice" },
      { subjectType: "radical", srsStage: 0, status: "locked" },
    ]);
    expect(summary.levelCounts).toEqual({ 9: 1, 12: 1 });
    expect(summary.typeCountsByLevel[9]?.kanji).toBe(1);
    expect(summary.typeCounts).toEqual({ all: 3, radical: 1, kanji: 1, vocabulary: 1 });
    expect(summary.srsCounts.guru).toBe(1);
    expect(summary.srsStageCounts).toEqual({ 5: 1, 1: 1, 0: 1 });
  });

  it("names the direction an answer moved an item", () => {
    expect(srsTransition("apprentice", "guru")).toBe("promoted");
    expect(srsTransition("guru", "apprentice")).toBe("demoted");
    expect(srsTransition("guru", "guru")).toBe("unchanged");
    expect(srsTransition(null, "guru")).toBe("unknown");
  });
});
