import { useMemo } from "react";

import type { LevelItem, Snapshot, SrsFilter } from "../../explorerTypes";
import { stripHtml } from "./levelExplorerDisplay";
import { isVocabularySubjectType } from "./levelExplorerDomain";
import { buildKanjiByCharacter, buildSubjectById, buildVocabularyKanjiLinks } from "./levelExplorerItemDetails";
import {
  buildCombinedSnapshot,
  computeJlptCounts,
  computeLevelItemCounts,
  computeReviewTimingCounts,
  filterAndSortLevelItems,
} from "./levelExplorerSelectors";
import { normalizeSnapshot } from "./levelExplorerSnapshotUtils";
import type { JlptFilter, ReviewTimingFilter, TypeFilter, TypeVisibility } from "./levelExplorerState";

type UseLevelExplorerDerivedDataArgs = {
  initialSnapshot: Snapshot;
  selectedLevels: Set<number>;
  snapshotsByLevel: Map<number, Snapshot>;
  levelItemCountsByLevel: Record<number, number>;
  selectedSubjectId: number | null;
  accountPendingReviews: number;
  recentOnly: boolean;
  showLocked: boolean;
  srsFilter: SrsFilter;
  typeFilter: TypeFilter;
  jlptFilter: JlptFilter;
  reviewTimingFilter: ReviewTimingFilter;
  visibleTypes: TypeVisibility;
  searchMatchedSubjectIds: Set<number> | null;
};

// Derives the combined snapshot, filtered/selected items, counts, and related-panel
// flags that the level explorer controller passes down to LevelExplorerContent.
export function useLevelExplorerDerivedData({
  initialSnapshot,
  selectedLevels,
  snapshotsByLevel,
  levelItemCountsByLevel,
  selectedSubjectId,
  accountPendingReviews,
  recentOnly,
  showLocked,
  srsFilter,
  typeFilter,
  jlptFilter,
  reviewTimingFilter,
  visibleTypes,
  searchMatchedSubjectIds,
}: UseLevelExplorerDerivedDataArgs) {
  const combinedSnapshot = useMemo(
    () => buildCombinedSnapshot(selectedLevels, snapshotsByLevel, normalizeSnapshot(initialSnapshot)),
    [initialSnapshot, selectedLevels, snapshotsByLevel],
  );

  const levelItemCountsByLevelEffective = useMemo(() => {
    const merged = { ...levelItemCountsByLevel };
    for (const [level, snapshot] of snapshotsByLevel.entries()) {
      merged[level] = snapshot.items.length;
    }
    return merged;
  }, [levelItemCountsByLevel, snapshotsByLevel]);

  const filteredItems: LevelItem[] = useMemo(
    () =>
      filterAndSortLevelItems(combinedSnapshot.items, {
        recentOnly,
        showLocked,
        srsFilter,
        typeFilter,
        jlptFilter,
        reviewTimingFilter,
        visibleTypes,
        searchMatchedSubjectIds,
      }),
    [
      combinedSnapshot.items,
      recentOnly,
      showLocked,
      srsFilter,
      typeFilter,
      jlptFilter,
      reviewTimingFilter,
      visibleTypes,
      searchMatchedSubjectIds,
    ],
  );

  const selectedItem = filteredItems.find((item) => item.subjectId === selectedSubjectId) ?? null;
  const selectedItemFromAll =
    selectedSubjectId === null ? null : combinedSnapshot.items.find((item) => item.subjectId === selectedSubjectId) ?? null;

  const counts = useMemo(() => computeLevelItemCounts(combinedSnapshot.items), [combinedSnapshot.items]);
  const jlptCounts = useMemo(() => computeJlptCounts(combinedSnapshot.items), [combinedSnapshot.items]);
  const reviewTimingCounts = useMemo(
    () => computeReviewTimingCounts(combinedSnapshot.items),
    [combinedSnapshot.items],
  );
  const overdueOutsideSelectedLevels = Math.max(0, accountPendingReviews - reviewTimingCounts.overdue);
  const selectedLevelList = Array.from(selectedLevels.values()).sort((a, b) => a - b);
  const subjectById = useMemo(() => buildSubjectById(combinedSnapshot.items), [combinedSnapshot.items]);
  const kanjiByCharacter = useMemo(() => buildKanjiByCharacter(combinedSnapshot.items), [combinedSnapshot.items]);

  const vocabularyKanjiLinks = useMemo(
    () => buildVocabularyKanjiLinks(selectedItem, subjectById, kanjiByCharacter),
    [selectedItem, subjectById, kanjiByCharacter],
  );

  const hasPrimaryRelatedPanel = selectedItem
    ? isVocabularySubjectType(selectedItem.subjectType)
      ? vocabularyKanjiLinks.length > 0
      : (selectedItem.radicals?.length ?? 0) > 0
    : false;
  const hasVisuallySimilarPanel = (selectedItem?.visuallySimilar?.length ?? 0) > 0;
  const hasUsedInVocabularyPanel = (selectedItem?.usedInVocabulary?.length ?? 0) > 0;
  const selectedMeaningExplanation = stripHtml(selectedItem?.meaningExplanation) || "-";
  const selectedReadingExplanationRaw = stripHtml(selectedItem?.readingExplanation);
  const showReadingExplanation = selectedReadingExplanationRaw.length > 0;

  return {
    combinedSnapshot,
    levelItemCountsByLevelEffective,
    filteredItems,
    selectedItem,
    selectedItemFromAll,
    counts,
    jlptCounts,
    reviewTimingCounts,
    overdueOutsideSelectedLevels,
    selectedLevelList,
    subjectById,
    kanjiByCharacter,
    vocabularyKanjiLinks,
    hasPrimaryRelatedPanel,
    hasVisuallySimilarPanel,
    hasUsedInVocabularyPanel,
    selectedMeaningExplanation,
    selectedReadingExplanationRaw,
    showReadingExplanation,
  };
}
