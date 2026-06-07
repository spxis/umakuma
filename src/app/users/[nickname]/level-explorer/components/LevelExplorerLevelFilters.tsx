import { useMemo, useState } from "react";

import FilterChipLabel from "../../shared/FilterChipLabel";
import { badgeClass, disabledBadgeClass, formatNumber } from "../lib/levelExplorerDisplay";
import { groupStudyReviewLevelChips, type StudyReviewLevelChip } from "../../study-explorer/lib/studyExplorerUtils";

type Props = {
  levelOptions: number[];
  levelItemCountsByLevel: Record<number, number>;
  selectedLevels: Set<number>;
  searchAvailableLevels: Set<number> | null;
  onSelectAllLevelsAndClearSearch: () => Promise<void>;
  onToggleLevel: (level: number) => Promise<void>;
};

const groupedLevelBadgeClass = (active: boolean): string =>
  active
    ? "border-amber-400 bg-amber-100 text-amber-900"
    : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200";

function boundaryLevelForGroup(
  selectedLevel: number | null,
  startLevel: number,
  endLevel: number,
): number {
  if (selectedLevel === null) {
    return endLevel;
  }
  if (selectedLevel < startLevel) {
    return startLevel;
  }
  if (selectedLevel > endLevel) {
    return endLevel;
  }
  return selectedLevel;
}

export default function LevelExplorerLevelFilters({
  levelOptions,
  levelItemCountsByLevel,
  selectedLevels,
  searchAvailableLevels,
  onSelectAllLevelsAndClearSearch,
  onToggleLevel,
}: Props) {
  const isAllSelected = selectedLevels.size === levelOptions.length;
  const selectedLevel = selectedLevels.size === 1 ? Array.from(selectedLevels)[0] ?? null : null;

  const availableLevels = useMemo(() => {
    if (searchAvailableLevels === null) {
      return new Set(levelOptions);
    }

    const levels = new Set<number>(searchAvailableLevels);
    for (const level of selectedLevels) {
      levels.add(level);
    }
    return levels;
  }, [levelOptions, searchAvailableLevels, selectedLevels]);

  const activeLevels = useMemo(
    () => levelOptions.filter((level) => selectedLevel === level || availableLevels.has(level)),
    [availableLevels, levelOptions, selectedLevel],
  );

  const highestActiveLevel =
    activeLevels[activeLevels.length - 1] ?? levelOptions[levelOptions.length - 1] ?? 1;
  const recentStartLevel = Math.max(1, highestActiveLevel - 9);

  const [olderLevelsExpanded, setOlderLevelsExpanded] = useState(
    () => selectedLevel !== null && selectedLevel < recentStartLevel,
  );
  const effectiveOlderLevelsExpanded =
    selectedLevel !== null && selectedLevel < recentStartLevel
      ? true
      : olderLevelsExpanded;

  const shouldGroupLevels =
    searchAvailableLevels === null && selectedLevels.size <= 1 && levelOptions.length > 10;

  const groupedLevelChips = useMemo(
    () =>
      shouldGroupLevels
        ? groupStudyReviewLevelChips(
            levelOptions,
            availableLevels,
            selectedLevel,
            true,
            recentStartLevel,
            effectiveOlderLevelsExpanded,
          )
        : [],
    [
      availableLevels,
      effectiveOlderLevelsExpanded,
      levelOptions,
      recentStartLevel,
      selectedLevel,
      shouldGroupLevels,
    ],
  );

  const allLevelCount = levelOptions.reduce(
    (sum, level) => sum + (levelItemCountsByLevel[level] ?? 0),
    0,
  );

  const countForGroupedChip = (chip: StudyReviewLevelChip): number => {
    if (chip.kind === "single") {
      return levelItemCountsByLevel[chip.level] ?? 0;
    }

    let total = 0;
    for (let level = chip.startLevel; level <= chip.endLevel; level += 1) {
      total += levelItemCountsByLevel[level] ?? 0;
    }
    return total;
  };

  return (
    <div
      className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1"
      role="tablist"
      aria-label="Level filters"
    >
      <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">
        Level
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => {
            void onSelectAllLevelsAndClearSearch();
          }}
          role="tab"
          aria-selected={isAllSelected}
          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${badgeClass(isAllSelected)}`}
        >
          <FilterChipLabel label="All" count={formatNumber(allLevelCount)} />
        </button>

        {shouldGroupLevels
          ? groupedLevelChips.map((chip) => {
              if (chip.kind === "single") {
                const isSelected = selectedLevels.has(chip.level);
                return (
                  <button
                    key={chip.level}
                    type="button"
                    onClick={() => {
                      void onToggleLevel(chip.level);
                    }}
                    role="tab"
                    aria-selected={isSelected}
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${badgeClass(isSelected)}`}
                  >
                    <FilterChipLabel
                      label={chip.level}
                      count={formatNumber(levelItemCountsByLevel[chip.level] ?? 0)}
                    />
                  </button>
                );
              }

              const isOlderGroupChip = chip.group === "older";
              const isRecentGroupChip = chip.group === "recent";
              const isGroupedChip = isOlderGroupChip || isRecentGroupChip;
              const selectedInsideChip =
                selectedLevel !== null &&
                selectedLevel >= chip.startLevel &&
                selectedLevel <= chip.endLevel;
              const isSelected = isGroupedChip && selectedInsideChip;
              const count = countForGroupedChip(chip);

              return (
                <button
                  key={`range-${chip.startLevel}-${chip.endLevel}-${chip.group ?? "disabled"}`}
                  type="button"
                  onClick={
                    isOlderGroupChip
                      ? () => {
                          setOlderLevelsExpanded(true);
                          void onToggleLevel(
                            boundaryLevelForGroup(
                              selectedLevel,
                              chip.startLevel,
                              chip.endLevel,
                            ),
                          );
                        }
                      : isRecentGroupChip
                        ? () => {
                            setOlderLevelsExpanded(false);
                            void onToggleLevel(
                              boundaryLevelForGroup(
                                selectedLevel,
                                chip.startLevel,
                                chip.endLevel,
                              ),
                            );
                          }
                        : undefined
                  }
                  disabled={!isGroupedChip}
                  role="tab"
                  aria-selected={isSelected}
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${
                    !isGroupedChip
                      ? disabledBadgeClass()
                      : groupedLevelBadgeClass(isSelected)
                  }`}
                >
                  {isGroupedChip ? (
                    <FilterChipLabel
                      label={
                        chip.startLevel === chip.endLevel
                          ? chip.startLevel
                          : `${chip.startLevel}-${chip.endLevel}`
                      }
                      count={formatNumber(count)}
                    />
                  ) : chip.startLevel === chip.endLevel ? (
                    chip.startLevel
                  ) : (
                    `${chip.startLevel}-${chip.endLevel}`
                  )}
                </button>
              );
            })
          : levelOptions.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  void onToggleLevel(level);
                }}
                disabled={searchAvailableLevels !== null && !searchAvailableLevels.has(level)}
                role="tab"
                aria-selected={selectedLevels.has(level)}
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${badgeClass(selectedLevels.has(level))}`}
              >
                <FilterChipLabel
                  label={level}
                  count={formatNumber(levelItemCountsByLevel[level] ?? 0)}
                />
              </button>
            ))}
      </div>
    </div>
  );
}
