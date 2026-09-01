import { describe, expect, it, vi } from "vitest";

import type { LevelItem, Snapshot } from "../../explorerTypes";
import { buildLevelExplorerActions } from "./levelExplorerControllerActions";

/**
 * The All tab has to select all the levels.
 *
 * It did not. `selectAllLevelsAndClearSearch` put the member back on their own
 * level - `new Set([initialLevel])` - so on a level 17 account the tab read
 * `All (2,922)` and then showed level 17's 169 items. Clicking it looked like
 * nothing happened, because the level it reselected was the one already
 * selected, and the count on the tab described a view the UI could not reach.
 *
 * Found while repairing the smoke suite rather than by a report: a check
 * comparing the all-levels count against the filtered total could not be made
 * to pass honestly.
 */

const MAX_LEVEL = 20;
const INITIAL_LEVEL = 17;

function snapshot(level: number): Snapshot {
  return {
    level,
    kanjiTotal: 0,
    kanjiLearned: 0,
    kanjiGuruPlus: 0,
    kanjiLocked: 0,
    estimatedHoursRemaining: null,
    items: [],
  };
}

function harness(alreadyLoaded: number[] = []) {
  const loaded: number[] = [];
  const selectedLevels: Set<number>[] = [];

  const actions = buildLevelExplorerActions({
    maxLevel: MAX_LEVEL,
    initialLevel: INITIAL_LEVEL,
    stickyMerge: false,
    searchAvailableLevels: null,
    snapshotsByLevel: new Map(alreadyLoaded.map((level) => [level, snapshot(level)])),
    subjectById: new Map<number, LevelItem>(),
    combinedItems: [],
    markHistoryPush: vi.fn(),
    ensureLevelLoaded: async (level: number) => {
      loaded.push(level);
      return snapshot(level);
    },
    setError: vi.fn(),
    setSelectedSubjectId: vi.fn(),
    setSelectedLevels: ((next: Set<number>) => {
      selectedLevels.push(next);
    }) as never,
    setSearchMatchedSubjectIds: vi.fn(),
    setSearchAvailableLevels: vi.fn(),
    setVisibleTypesAndPersist: vi.fn(),
    setTypeFilterAndEnsureVisible: vi.fn(),
    setRecentOnly: vi.fn(),
    setTypeFilter: vi.fn(),
    setSrsFilter: vi.fn(),
    setJlptFilter: vi.fn(),
    setReviewTimingFilter: vi.fn(),
  });

  return { actions, loaded, selectedLevels };
}

describe("choosing All on the WaniKani explorer", () => {
  it("selects every level, not the member's own", async () => {
    const { actions, selectedLevels } = harness();
    await actions.selectAllLevelsAndClearSearch();

    const chosen = selectedLevels.at(-1);
    expect(chosen?.size).toBe(MAX_LEVEL);
    expect([...(chosen ?? [])].sort((a, b) => a - b)).toEqual(
      Array.from({ length: MAX_LEVEL }, (_, index) => index + 1),
    );
    /* The specific regression: one level, and it was the one already showing. */
    expect(chosen).not.toEqual(new Set([INITIAL_LEVEL]));
  });

  it("loads every level it does not already hold", async () => {
    const { actions, loaded } = harness();
    await actions.selectAllLevelsAndClearSearch();

    expect([...loaded].sort((a, b) => a - b)).toEqual(
      Array.from({ length: MAX_LEVEL }, (_, index) => index + 1),
    );
  });

  /*
   * A level's snapshot is cached client-side once fetched. Refetching what is
   * already held would put a request per level on every press of the tab.
   */
  it("does not refetch the levels already held", async () => {
    const held = [1, 2, 3, INITIAL_LEVEL];
    const { actions, loaded } = harness(held);
    await actions.selectAllLevelsAndClearSearch();

    for (const level of held) {
      expect(loaded, `level ${level} was already held`).not.toContain(level);
    }
    expect(loaded).toHaveLength(MAX_LEVEL - held.length);
  });

  /*
   * Sixty cold levels at once would be sixty requests reaching WaniKani
   * together, so they go a few at a time. Asserted by watching how many are in
   * flight rather than by reading the batch size back.
   */
  it("keeps only a few requests in flight at once", async () => {
    let inFlight = 0;
    let peak = 0;

    const actions = buildLevelExplorerActions({
      maxLevel: MAX_LEVEL,
      initialLevel: INITIAL_LEVEL,
      stickyMerge: false,
      searchAvailableLevels: null,
      snapshotsByLevel: new Map(),
      subjectById: new Map<number, LevelItem>(),
      combinedItems: [],
      markHistoryPush: vi.fn(),
      ensureLevelLoaded: async (level: number) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        return snapshot(level);
      },
      setError: vi.fn(),
      setSelectedSubjectId: vi.fn(),
      setSelectedLevels: vi.fn(),
      setSearchMatchedSubjectIds: vi.fn(),
      setSearchAvailableLevels: vi.fn(),
      setVisibleTypesAndPersist: vi.fn(),
      setTypeFilterAndEnsureVisible: vi.fn(),
      setRecentOnly: vi.fn(),
      setTypeFilter: vi.fn(),
      setSrsFilter: vi.fn(),
      setJlptFilter: vi.fn(),
      setReviewTimingFilter: vi.fn(),
    });

    await actions.selectAllLevelsAndClearSearch();

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(MAX_LEVEL);
  });
});
