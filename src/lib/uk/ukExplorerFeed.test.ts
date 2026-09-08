import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { asInjectedTrouble, mapUkQueueItem, ourLevelSlot, ukContentSourceFor, ukQueueTypeFor, withStudyTags, withWanikaniRadicalNames } from "./ukExplorerFeed";
import { UK_SUBJECT_ID_BASE } from "./ukSubjectIdentity";
import type { UkStudyItem } from "./ukStudyQueue";

const item = (over: Partial<UkStudyItem> = {}): UkStudyItem => ({
  subjectId: 10_000_440, key: "kanji:語", kind: "kanji", characters: "語", level: 9, stream: LADDER_STREAMS.un,
  meanings: ["language"], readings: ["ご"], srsStage: 5, passed: true, wkSubjectId: 440,
  wkLevel: 8, radicals: [], componentKanji: [], usedInVocabulary: [], jlptLevel: 3, jlptMeta: null, confusables: [], startedAt: null, availableAt: null, ...over,
});

describe("the UK feed, in the explorer's shape", () => {
  it("is a lesson until it has a stage, and a review after", () => {
    expect(ukQueueTypeFor({ srsStage: null })).toBe("lesson");
    expect(ukQueueTypeFor({ srsStage: 1 })).toBe("review");
  });

  it("answers to the WaniKani id, and to a reserved one where WaniKani never taught it", () => {
    expect(mapUkQueueItem(item()).subjectId).toBe(440);
    expect(mapUkQueueItem(item({ wkSubjectId: null })).subjectId).toBe(UK_SUBJECT_ID_BASE + 10_000_440);
  });

  it("puts the member's marks and WaniKani's radical name on by the right key each", () => {
    const [tagged] = withStudyTags([mapUkQueueItem(item())], [{ subjectId: 440, favorite: true, trouble: false, burned: false }]);
    expect(tagged!.studyTags).toEqual({ favorite: true, trouble: false, burned: false });
    const [named] = withWanikaniRadicalNames([mapUkQueueItem(item({ kind: "radical" }))], new Map([[10_000_440, "Toe"]]));
    expect(named!.wanikaniName).toBe("Toe");
  });

  it("keys the assignment by the ladder's own id and files the level as ours, with WaniKani's beside it", () => {
    const mapped = mapUkQueueItem(item());
    expect(mapped.assignmentId).toBe(10_000_440);
    expect(mapped.unLevel).toBe(9);
    expect(mapped.wkLevel).toBe(8);
    expect(mapUkQueueItem(item({ wkLevel: null })).wkLevel).toBeUndefined();
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

  it("hands the review everything the WaniKani feed would, dates included", () => {
    const due = new Date("2026-09-08T02:00:00Z");
    const met = new Date("2026-08-01T00:00:00Z");
    const mapped = mapUkQueueItem(item({ availableAt: due, startedAt: met, jlptLevel: 2, radicals: [{ subjectId: 1, label: "言" }] }));
    expect(mapped.availableAt).toBe(due.toISOString());
    expect(mapped.startedAt).toBe(met.toISOString());
    expect(mapped.jlptLevel).toBe(2);
    expect(mapped.radicals).toEqual([{ subjectId: 1, label: "言" }]);
    expect(mapped.confusables).toEqual([]);
  });

  it("marks a trouble item mixed into the sitting as practice, with a negative assignment", () => {
    const injected = asInjectedTrouble(mapUkQueueItem(item()));
    expect(injected.assignmentId).toBe(-10_000_440);
    expect(injected.isInjectedTrouble).toBe(true);
    expect(injected.subjectId).toBe(440);
    /* WaniKani's radical name still finds it. */
    const [named] = withWanikaniRadicalNames([asInjectedTrouble(mapUkQueueItem(item({ kind: "radical" })))], new Map([[10_000_440, "Toe"]]));
    expect(named!.wanikaniName).toBe("Toe");
  });

  it("credits the words to whoever wrote them", () => {
    expect(ukContentSourceFor({ wkSubjectId: 440, kind: "kanji" })).toBe("wanikani");
    expect(ukContentSourceFor({ wkSubjectId: null, kind: "kanji" })).toBe("kanjidic2");
    expect(ukContentSourceFor({ wkSubjectId: null, kind: "radical" })).toBe("radkfile");
  });
});
