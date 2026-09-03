import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({ getCatalogSubjectDetails: vi.fn() }));

vi.mock("@/lib/subjectCatalogDetails", () => catalog);

const { getUserKanjiIndexFromCache } = await import("./kanjiIndex");

function assignmentRow(subjectId: number, srsStage: number, unlocked = true) {
  return {
    id: subjectId * 10,
    data: {
      subject_id: subjectId,
      subject_type: "kanji",
      srs_stage: srsStage,
      unlocked_at: unlocked ? "2026-01-01T00:00:00Z" : null,
      started_at: "2026-01-02T00:00:00Z",
      passed_at: null,
      available_at: null,
    },
  };
}

function catalogEntry(characters: string) {
  return {
    subjectType: "kanji",
    characters,
    meanings: ["one", "two", "three", "four"],
    readings: ["いち"],
    primaryReadings: ["いち"],
    meaningExplanation: "m",
    readingExplanation: "r",
    wkLevel: 2,
  };
}

beforeEach(() => {
  catalog.getCatalogSubjectDetails.mockReset();
});

/*
 * The member's SRS state comes from WaniKani, but not on the render path.
 * `Account.assignmentCache` holds the whole /assignments collection, refreshed
 * by the ordinary five-minute sync through `updated_after`, and the games and
 * study tags already read it. Fetching it again cost the JLPT explorer around
 * 650ms of server render before it drew a single kanji.
 */
describe("the kanji index, from the synced assignment cache", () => {
  it("builds the member's kanji without asking WaniKani for anything", async () => {
    catalog.getCatalogSubjectDetails.mockResolvedValue(new Map([[440, catalogEntry("一")]]));

    const index = await getUserKanjiIndexFromCache([assignmentRow(440, 9)], null);

    expect(index).toHaveLength(1);
    expect(index[0]).toMatchObject({ subjectId: 440, characters: "一", srsStage: 9, wkLevel: 2 });
    expect(catalog.getCatalogSubjectDetails).toHaveBeenCalledWith([440]);
  });

  it("takes only the kanji, not the radicals and vocabulary sharing the cache", async () => {
    catalog.getCatalogSubjectDetails.mockResolvedValue(new Map([[440, catalogEntry("一")]]));

    const rows = [
      assignmentRow(440, 5),
      { id: 1, data: { subject_id: 1, subject_type: "radical", srs_stage: 5 } },
      { id: 2, data: { subject_id: 2, subject_type: "vocabulary", srs_stage: 5 } },
    ];

    await getUserKanjiIndexFromCache(rows, null);
    expect(catalog.getCatalogSubjectDetails).toHaveBeenCalledWith([440]);
  });

  /* A locked assignment is not "apprentice at stage 0"; it is not started. */
  it("reads a never-unlocked assignment as locked", async () => {
    catalog.getCatalogSubjectDetails.mockResolvedValue(new Map([[440, catalogEntry("一")]]));
    const [item] = await getUserKanjiIndexFromCache([assignmentRow(440, 0, false)], null);
    expect(item.status).toBe("locked");
  });

  /*
   * Without a token there is no API to fall back to, and an account that has
   * never synced has no cache. Neither is an error: the explorer is a table of
   * every JLPT kanji, and the member's own progress is the part they lack.
   */
  it("is empty for an account that has never synced", async () => {
    expect(await getUserKanjiIndexFromCache(null, null)).toEqual([]);
    expect(await getUserKanjiIndexFromCache([], null)).toEqual([]);
    expect(catalog.getCatalogSubjectDetails).not.toHaveBeenCalled();
  });

  it("drops a subject the catalogue cannot name and there is no token to ask about", async () => {
    catalog.getCatalogSubjectDetails.mockResolvedValue(new Map());
    expect(await getUserKanjiIndexFromCache([assignmentRow(440, 5)], null)).toEqual([]);
  });

  /* Two assignments for one character: the further-along one wins. */
  it("keeps the highest stage when a character appears twice", async () => {
    catalog.getCatalogSubjectDetails.mockResolvedValue(
      new Map([[440, catalogEntry("一")], [441, catalogEntry("一")]]),
    );
    const index = await getUserKanjiIndexFromCache(
      [assignmentRow(440, 3), assignmentRow(441, 8)],
      null,
    );
    expect(index).toHaveLength(1);
    expect(index[0].srsStage).toBe(8);
  });
});
