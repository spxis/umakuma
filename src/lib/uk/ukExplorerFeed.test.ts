import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { mapUkQueueItem, ourLevelSlot, ukContentSourceFor, ukQueueTypeFor } from "./ukExplorerFeed";
import type { UkStudyItem } from "./ukStudyQueue";

const item = (over: Partial<UkStudyItem> = {}): UkStudyItem => ({
  subjectId: 10_000_440, key: "kanji:語", kind: "kanji", characters: "語", level: 9, stream: LADDER_STREAMS.un,
  meanings: ["language"], readings: ["ご"], srsStage: 5, passed: true, wkSubjectId: 440, ...over,
});

describe("the UK feed, in the explorer's shape", () => {
  it("is a lesson until it has a stage, and a review after", () => {
    expect(ukQueueTypeFor({ srsStage: null })).toBe("lesson");
    expect(ukQueueTypeFor({ srsStage: 1 })).toBe("review");
  });

  it("keys the assignment by subject and files the level as ours, never WaniKani's", () => {
    const mapped = mapUkQueueItem(item());
    expect(mapped.assignmentId).toBe(10_000_440);
    expect(mapped.unLevel).toBe(9);
    expect(mapped.wkLevel).toBeUndefined();
    expect(mapped.status).toBe("guru");
    expect(mapped.queueType).toBe("review");
  });

  it("puts the level in the slot its ladder names, so the chip cannot mislabel it", () => {
    expect(ourLevelSlot({ level: 9, stream: LADDER_STREAMS.un })).toEqual({ unLevel: 9, ugLevel: null });
    expect(ourLevelSlot({ level: 23, stream: LADDER_STREAMS.ug })).toEqual({ unLevel: null, ugLevel: 23 });
    const onUg = mapUkQueueItem(item({ level: 23, stream: LADDER_STREAMS.ug }));
    expect(onUg.ugLevel).toBe(23);
    expect(onUg.unLevel).toBeNull();
  });

  it("credits the words to whoever wrote them", () => {
    expect(ukContentSourceFor({ wkSubjectId: 440, kind: "kanji" })).toBe("wanikani");
    expect(ukContentSourceFor({ wkSubjectId: null, kind: "kanji" })).toBe("kanjidic2");
    expect(ukContentSourceFor({ wkSubjectId: null, kind: "radical" })).toBe("radkfile");
  });
});
