import { useMemo, useState } from "react";
import { formatNumber } from "../../level-explorer/lib/levelExplorerDisplay";
import FilterChipLabel from "../../shared/FilterChipLabel";
import { STUDY_PANEL_TEXT, STUDY_QUEUE_TYPES } from "./StudyExplorer.constants";
import type { StudyQueueMode } from "../lib/studyExplorerTypes";
import { badgeClass, disabledBadgeClass, groupStudyReviewLevelChips, type StudyReviewLevelChip } from "../lib/studyExplorerUtils";

type Props = {
  queueMode: StudyQueueMode;
  filtersLoading: boolean;
  viewedLevel: number | null;
  levelOptions: number[];
  lessonLevelOptions: Array<readonly [number, number]>;
  availableLevels: Set<number>;
  reviewLevelCounts: Record<number, number>;
  totalLessonsInVisibleLevels: number;
  totalReviewsInVisibleLevels: number;
  mobileShowAllOptions: boolean;
  onToggleMobileShowAllOptions: () => void;
  onSetViewedLevel: (level: number | null) => void;
};

const groupedLevelBadgeClass = (active: boolean): string =>
  active
    ? "border-amber-400 bg-amber-100 text-amber-900"
    : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200";

function boundaryLevelForGroup(
  viewedLevel: number | null,
  startLevel: number,
  endLevel: number,
): number {
  if (viewedLevel === null) {
    return endLevel;
  }
  if (viewedLevel < startLevel) {
    return startLevel;
  }
  if (viewedLevel > endLevel) {
    return endLevel;
  }
  return viewedLevel;
}

export default function StudyLevelFilters({
  queueMode,
  filtersLoading,
  viewedLevel,
  levelOptions,
  lessonLevelOptions,
  availableLevels,
  reviewLevelCounts,
  totalLessonsInVisibleLevels,
  totalReviewsInVisibleLevels,
  mobileShowAllOptions,
  onToggleMobileShowAllOptions,
  onSetViewedLevel,
}: Props) {
  const activeReviewLevels = useMemo(
    () => levelOptions.filter((level) => viewedLevel === level || availableLevels.has(level)),
    [availableLevels, levelOptions, viewedLevel],
  );
  const highestActiveReviewLevel = activeReviewLevels[activeReviewLevels.length - 1] ?? levelOptions[levelOptions.length - 1] ?? 1;
  const recentStartLevel = Math.max(1, highestActiveReviewLevel - 9);
  const [olderLevelsExpanded, setOlderLevelsExpanded] = useState(
    () => viewedLevel !== null && viewedLevel < recentStartLevel,
  );

  const reviewLevelChips = useMemo(
    () => groupStudyReviewLevelChips(levelOptions, availableLevels, viewedLevel, true, recentStartLevel, olderLevelsExpanded),
    [availableLevels, levelOptions, olderLevelsExpanded, recentStartLevel, viewedLevel],
  );

  const selectLevel = (level: number | null) => {
    if (level === null) {
      setOlderLevelsExpanded(false);
      onSetViewedLevel(null);
      return;
    }

    setOlderLevelsExpanded(level < recentStartLevel);
    onSetViewedLevel(level);
  };

  const countForChip = (chip: StudyReviewLevelChip): number => {
    if (chip.kind === "single") {
      return reviewLevelCounts[chip.level] ?? 0;
    }
    let total = 0;
    for (let level = chip.startLevel; level <= chip.endLevel; level += 1) {
      total += reviewLevelCounts[level] ?? 0;
    }
    return total;
  };

  const mobileVisibilityClass = (selected: boolean) =>
    mobileShowAllOptions || selected ? "" : "hidden sm:inline-flex";
  const isCollapsedOnMobile = !mobileShowAllOptions;
  const shouldExpandForSelectedTap = (isSelected: boolean) => isCollapsedOnMobile && isSelected;

  return (
    <div className="flex w-full max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label={STUDY_PANEL_TEXT.levelFilters}>
      <button
        type="button"
        onClick={onToggleMobileShowAllOptions}
        aria-pressed={!mobileShowAllOptions}
        className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70"
        title={mobileShowAllOptions ? STUDY_PANEL_TEXT.compactLevel : STUDY_PANEL_TEXT.expandLevel}
      >
        {STUDY_PANEL_TEXT.level}
        {isCollapsedOnMobile ? (
          <span className="ml-1 text-[11px] leading-none opacity-70 sm:hidden">+</span>
        ) : null}
      </button>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => {
            if (shouldExpandForSelectedTap(viewedLevel === null)) {
              onToggleMobileShowAllOptions();
              return;
            }
            selectLevel(null);
          }}
          disabled={filtersLoading}
          role="tab"
          aria-selected={viewedLevel === null}
          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${mobileVisibilityClass(viewedLevel === null)} ${filtersLoading && viewedLevel !== null ? disabledBadgeClass() : badgeClass(viewedLevel === null)}`}
        >
          <FilterChipLabel
            label={STUDY_PANEL_TEXT.all}
            count={formatNumber(queueMode === STUDY_QUEUE_TYPES.lesson ? totalLessonsInVisibleLevels : totalReviewsInVisibleLevels)}
          />
        </button>
        {queueMode === STUDY_QUEUE_TYPES.lesson
          ? lessonLevelOptions.map(([level, count]) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  if (shouldExpandForSelectedTap(viewedLevel === level)) {
                    onToggleMobileShowAllOptions();
                    return;
                  }
                  selectLevel(level);
                }}
                disabled={filtersLoading}
                role="tab"
                aria-selected={viewedLevel === level}
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${mobileVisibilityClass(viewedLevel === level)} ${filtersLoading && viewedLevel !== level ? disabledBadgeClass() : badgeClass(viewedLevel === level)}`}
              >
                <FilterChipLabel label={level} count={formatNumber(count)} />
              </button>
            ))
          : reviewLevelChips.map((chip) => {
              if (chip.kind === "range") {
                const isOlderGroupChip = chip.group === "older";
                const isRecentGroupChip = chip.group === "recent";
                const isGroupedChip = isOlderGroupChip || isRecentGroupChip;
                const viewedLevelInsideChip =
                  viewedLevel !== null && viewedLevel >= chip.startLevel && viewedLevel <= chip.endLevel;
                const groupedChipSelected = isGroupedChip && viewedLevelInsideChip;
                const count = countForChip(chip);
                return (
                  <button
                    key={`range-${chip.startLevel}-${chip.endLevel}-${chip.group ?? "disabled"}`}
                    type="button"
                    onClick={
                      isOlderGroupChip
                        ? () => {
                            if (shouldExpandForSelectedTap(groupedChipSelected)) {
                              onToggleMobileShowAllOptions();
                              return;
                            }
                            setOlderLevelsExpanded(true);
                            onSetViewedLevel(boundaryLevelForGroup(viewedLevel, chip.startLevel, chip.endLevel));
                          }
                        : isRecentGroupChip
                          ? () => {
                              if (shouldExpandForSelectedTap(groupedChipSelected)) {
                                onToggleMobileShowAllOptions();
                                return;
                              }
                              setOlderLevelsExpanded(false);
                              onSetViewedLevel(boundaryLevelForGroup(viewedLevel, chip.startLevel, chip.endLevel));
                            }
                          : undefined
                    }
                    disabled={!isGroupedChip || filtersLoading}
                    role="tab"
                    aria-selected={groupedChipSelected}
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${
                      mobileVisibilityClass(groupedChipSelected)
                    } ${
                      !isGroupedChip || filtersLoading
                        ? disabledBadgeClass()
                        : groupedLevelBadgeClass(groupedChipSelected)
                    }`}
                  >
                    {isGroupedChip
                      ? <FilterChipLabel label={chip.startLevel === chip.endLevel ? chip.startLevel : `${chip.startLevel}-${chip.endLevel}`} count={formatNumber(count)} />
                      : (chip.startLevel === chip.endLevel ? chip.startLevel : `${chip.startLevel}-${chip.endLevel}`)}
                  </button>
                );
              }

              const isSelected = viewedLevel === chip.level;
              const disabled = filtersLoading && !isSelected;
              const levelCount = reviewLevelCounts[chip.level] ?? 0;
              return (
                <button
                  key={chip.level}
                  type="button"
                  onClick={() => {
                    if (shouldExpandForSelectedTap(isSelected)) {
                      onToggleMobileShowAllOptions();
                      return;
                    }
                    selectLevel(chip.level);
                  }}
                  disabled={disabled}
                  role="tab"
                  aria-selected={isSelected}
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${mobileVisibilityClass(isSelected)} ${disabled && !isSelected ? disabledBadgeClass() : badgeClass(isSelected)}`}
                >
                  <FilterChipLabel label={chip.level} count={formatNumber(levelCount)} />
                </button>
              );
            })}
        {isCollapsedOnMobile ? (
          <button
            type="button"
            onClick={onToggleMobileShowAllOptions}
            aria-label={STUDY_PANEL_TEXT.expandLevelFilters}
            className="ml-auto inline-flex h-7 items-center px-1 text-[12px] font-semibold tracking-[0.2em] text-foreground/35 sm:hidden"
          >
            ...
          </button>
        ) : null}
      </div>
    </div>
  );
}
