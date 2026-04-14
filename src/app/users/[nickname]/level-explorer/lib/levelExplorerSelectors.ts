import { toRomaji } from "wanakana";

import type { LevelItem, Snapshot, SrsFilter } from "../../explorerTypes";
import type { JlptFilter, ReviewTimingFilter, TypeFilter, TypeVisibility } from "./levelExplorerState";

export type LevelItemCounts = {
  all: number;
  apprentice: number;
  guru: number;
  master: number;
  enlightened: number;
  burned: number;
  locked: number;
  kanji: number;
  radical: number;
  vocabulary: number;
};

export type LevelJlptCounts = {
  none: number;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
};

export type ReviewTimingCounts = {
  overdue: number;
  next1h: number;
  next8h: number;
  next24h: number;
  next72h: number;
};

const LEVEL_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestampMs = Date.parse(value);
  return Number.isNaN(timestampMs) ? null : timestampMs;
}

export function isRecentLevelItem(item: LevelItem, nowMs: number = Date.now()): boolean {
  const anchorMs = parseTimestampMs(item.startedAt) ?? parseTimestampMs(item.availableAt);
  if (anchorMs === null) {
    return false;
  }

  return anchorMs >= nowMs - LEVEL_RECENT_WINDOW_MS && anchorMs <= nowMs;
}

function normalizeSearchTerm(input: string): string {
  return input.trim().toLowerCase();
}

function compactSearchTerm(input: string): string {
  return normalizeSearchTerm(input).replace(/[\s_-]+/g, "");
}

export function itemMatchesLevelSearch(item: LevelItem, rawQuery: string): boolean {
  const query = normalizeSearchTerm(rawQuery);
  if (!query) {
    return false;
  }

  const queryCompact = compactSearchTerm(rawQuery);
  const readingCandidates = [
    ...(item.primaryReadings ?? []),
    ...(item.readings ?? []),
  ].filter((reading): reading is string => Boolean(reading && reading.trim()));

  const meaningMatch = item.meanings.some((meaning) => normalizeSearchTerm(meaning).includes(query));
  if (meaningMatch) {
    return true;
  }

  if (item.characters && item.characters.includes(rawQuery.trim())) {
    return true;
  }

  return readingCandidates.some((reading) => {
    const normalizedReading = normalizeSearchTerm(reading);
    const compactReading = compactSearchTerm(reading);
    const romajiReading = normalizeSearchTerm(toRomaji(reading, { upcaseKatakana: false }));
    const compactRomaji = compactSearchTerm(romajiReading);

    return (
      normalizedReading.includes(query) ||
      compactReading.includes(queryCompact) ||
      romajiReading.includes(query) ||
      compactRomaji.includes(queryCompact)
    );
  });
}

export function passesReviewTimingFilter(
  item: LevelItem,
  reviewTimingFilter: ReviewTimingFilter,
  nowMs = Date.now(),
): boolean {
  if (reviewTimingFilter === "all") {
    return true;
  }

  if (!item.availableAt || item.status === "burned") {
    return false;
  }

  const availableTime = new Date(item.availableAt).getTime();
  if (Number.isNaN(availableTime)) {
    return false;
  }

  const deltaMs = availableTime - nowMs;
  if (reviewTimingFilter === "overdue") {
    return deltaMs <= 0;
  }

  if (deltaMs < 0) {
    return false;
  }

  const windowMs =
    reviewTimingFilter === "next1h"
      ? 60 * 60 * 1000
      : reviewTimingFilter === "next8h"
        ? 8 * 60 * 60 * 1000
        : reviewTimingFilter === "next24h"
          ? 24 * 60 * 60 * 1000
          : 72 * 60 * 60 * 1000;

  return deltaMs <= windowMs;
}

export function buildCombinedSnapshot(
  selectedLevels: Set<number>,
  snapshotsByLevel: Map<number, Snapshot>,
  initialSnapshot: Snapshot,
): Snapshot {
  const selected = Array.from(selectedLevels.values()).sort((a, b) => a - b);
  const snapshots = selected
    .map((level) => snapshotsByLevel.get(level))
    .filter((snapshot): snapshot is Snapshot => Boolean(snapshot));

  if (snapshots.length === 0) {
    return initialSnapshot;
  }

  const items = snapshots.flatMap((snapshot) => snapshot.items);
  const kanjiItems = items.filter((item) => item.subjectType === "kanji");

  return {
    level: selected[selected.length - 1],
    kanjiTotal: kanjiItems.length,
    kanjiLearned: kanjiItems.filter((item) => item.srsStage > 0).length,
    kanjiGuruPlus: kanjiItems.filter((item) => item.srsStage >= 5).length,
    kanjiLocked: kanjiItems.filter((item) => item.status === "locked").length,
    estimatedHoursRemaining: null,
    items,
    syncedAt: snapshots
      .map((snapshot) => snapshot.syncedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .pop(),
  };
}

export function filterAndSortLevelItems(
  items: LevelItem[],
  options: {
    recentOnly: boolean;
    showLocked: boolean;
    srsFilter: SrsFilter;
    typeFilter: TypeFilter;
    jlptFilter: JlptFilter;
    reviewTimingFilter: ReviewTimingFilter;
    visibleTypes: TypeVisibility;
    searchMatchedSubjectIds: Set<number> | null;
  },
): LevelItem[] {
  const typeOrder: Record<NonNullable<LevelItem["subjectType"]>, number> = {
    radical: 0,
    kanji: 1,
    vocabulary: 2,
  };

  const nowMs = Date.now();

  return items
    .filter((item) => {
      if (options.recentOnly && !isRecentLevelItem(item, nowMs)) {
        return false;
      }

      const searchPass = options.searchMatchedSubjectIds
        ? options.searchMatchedSubjectIds.has(item.subjectId)
        : true;
      const lockedVisibilityPass = options.showLocked || item.status !== "locked";
      const srsPass = options.srsFilter === "all" ? true : item.status === options.srsFilter;
      const typePass = options.typeFilter === "all" ? true : item.subjectType === options.typeFilter;
      const jlptPass =
        options.jlptFilter === "all"
          ? true
          : options.jlptFilter === "none"
            ? !item.jlptLevel
            : item.subjectType === "kanji" && item.jlptLevel === Number(options.jlptFilter.slice(1));
      const burnedPass = true;
      const reviewTimingPass = passesReviewTimingFilter(item, options.reviewTimingFilter, nowMs);
      const visibilityPass =
        item.subjectType === "radical"
          ? options.visibleTypes.radical
          : item.subjectType === "kanji"
            ? options.visibleTypes.kanji
            : item.subjectType === "vocabulary"
              ? options.visibleTypes.vocabulary
              : true;

      return (
        searchPass &&
        lockedVisibilityPass &&
        srsPass &&
        typePass &&
        jlptPass &&
        burnedPass &&
        reviewTimingPass &&
        visibilityPass
      );
    })
    .sort((a, b) => {
      const aOrder = a.subjectType ? typeOrder[a.subjectType] : 99;
      const bOrder = b.subjectType ? typeOrder[b.subjectType] : 99;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      if ((a.wkLevel ?? 0) !== (b.wkLevel ?? 0)) {
        return (a.wkLevel ?? 0) - (b.wkLevel ?? 0);
      }

      return a.subjectId - b.subjectId;
    });
}

export function computeLevelItemCounts(items: LevelItem[]): LevelItemCounts {
  const base: LevelItemCounts = {
    all: items.length,
    apprentice: 0,
    guru: 0,
    master: 0,
    enlightened: 0,
    burned: 0,
    locked: 0,
    kanji: 0,
    radical: 0,
    vocabulary: 0,
  };

  for (const item of items) {
    base[item.status] += 1;
    if (item.subjectType) {
      base[item.subjectType] += 1;
    }
  }

  return base;
}

export function computeJlptCounts(items: LevelItem[]): LevelJlptCounts {
  const base: LevelJlptCounts = { none: 0, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 };

  for (const item of items) {
    if (!item.jlptLevel) {
      base.none += 1;
      continue;
    }

    const key = `n${item.jlptLevel}` as keyof LevelJlptCounts;
    if (key in base) {
      base[key] += 1;
    }
  }

  return base;
}

export function computeReviewTimingCounts(items: LevelItem[], nowMs = Date.now()): ReviewTimingCounts {
  const base: ReviewTimingCounts = {
    overdue: 0,
    next1h: 0,
    next8h: 0,
    next24h: 0,
    next72h: 0,
  };

  for (const item of items) {
    if (!item.availableAt || item.status === "burned") {
      continue;
    }

    const availableTime = new Date(item.availableAt).getTime();
    if (Number.isNaN(availableTime)) {
      continue;
    }

    const deltaMs = availableTime - nowMs;
    if (deltaMs <= 0) {
      base.overdue += 1;
    }

    if (deltaMs >= 0 && deltaMs <= 60 * 60 * 1000) {
      base.next1h += 1;
    }

    if (deltaMs >= 0 && deltaMs <= 8 * 60 * 60 * 1000) {
      base.next8h += 1;
    }

    if (deltaMs >= 0 && deltaMs <= 24 * 60 * 60 * 1000) {
      base.next24h += 1;
    }

    if (deltaMs >= 0 && deltaMs <= 72 * 60 * 60 * 1000) {
      base.next72h += 1;
    }
  }

  return base;
}
