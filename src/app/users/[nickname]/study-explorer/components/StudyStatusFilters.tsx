import StudyFilterSection from "./StudyFilterSection";
import {
  getSrsStageOptions,
  STUDY_PANEL_TEXT,
  STUDY_PANEL_SRS_STATUSES,
  STUDY_SRS_FILTERS,
  studySrsToneClass,
} from "./StudyExplorer.constants";
import type { StudySrsFilter, StudySrsStageFilter } from "../lib/studyExplorerTypes";
import { srsFilterButtonLabel, formatNumber } from "../../level-explorer/lib/levelExplorerDisplay";
import { badgeClass, disabledBadgeClass } from "../lib/studyExplorerUtils";
import FilterChipButton from "../../shared/FilterChipButton";

type Props = {
  isOpen: boolean;
  filtersLoading: boolean;
  hasData: boolean;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  srsCounts: { all: number; locked: number; apprentice: number; guru: number; master: number; enlightened: number; burned: number };
  srsStageCounts: Record<number, number>;
  onToggleSection: () => void;
  onSetSectionOpen: (isOpen: boolean) => void;
  onSetSrsFilter: (filter: StudySrsFilter) => void;
  onSetSrsStageFilter: (filter: StudySrsStageFilter | null) => void;
};

function closeStatusSectionReliably(onSetSectionOpen: (isOpen: boolean) => void): void {
  onSetSectionOpen(false);
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => {
      onSetSectionOpen(false);
    });
  }
}

export default function StudyStatusFilters({
  isOpen,
  filtersLoading,
  hasData,
  srsFilter,
  srsStageFilter,
  srsCounts,
  srsStageCounts,
  onToggleSection,
  onSetSectionOpen,
  onSetSrsFilter,
  onSetSrsStageFilter,
}: Props) {
  return (
    <StudyFilterSection
      title={STUDY_PANEL_TEXT.status}
      isOpen={isOpen}
      onToggle={onToggleSection}
      ariaLabel={STUDY_PANEL_TEXT.statusFilters}
    >
      {STUDY_PANEL_SRS_STATUSES.map((status) => {
        const count = srsCounts[status];
        const isSelected = srsFilter === status;
        const hideStatusOnCollapsedMobile = !isOpen && !isSelected;
        const unavailable = hasData && !isSelected && status !== STUDY_SRS_FILTERS.all && count === 0;
        const disabled = (filtersLoading && !isSelected) || unavailable;
        const statusLabel = status === STUDY_SRS_FILTERS.all ? STUDY_PANEL_TEXT.all : srsFilterButtonLabel(status);
        const stageOptions = status === STUDY_SRS_FILTERS.all ? [] : getSrsStageOptions(status);
        const showStageButtons = isSelected && stageOptions.length > 1;

        const onClickStatus = () => {
          if (!isOpen && isSelected) {
            onSetSectionOpen(true);
            return;
          }
          onSetSrsFilter(status);
          if (stageOptions.length > 1) {
            onSetSrsStageFilter(null);
          }
          closeStatusSectionReliably(onSetSectionOpen);
        };

        if (unavailable) return null;

        return (
          <div
            key={status}
            className={
              hideStatusOnCollapsedMobile
                ? "hidden sm:inline-flex sm:items-center sm:gap-1"
                : "inline-flex items-center gap-1"
            }
          >
            <FilterChipButton
              type="button"
              onClick={onClickStatus}
              disabled={disabled}
              role="tab"
              aria-selected={isSelected}
              toneClassName={disabled && !isSelected ? disabledBadgeClass() : status === STUDY_SRS_FILTERS.all ? badgeClass(isSelected) : studySrsToneClass(status, isSelected)}
              label={statusLabel}
              count={formatNumber(count)}
            />
            {showStageButtons ? stageOptions.map((stage) => {
              const stageCount = srsStageCounts[stage] ?? 0;
              const stageSelected = srsStageFilter === stage;
              const stageUnavailable = hasData && !stageSelected && stageCount === 0;
              const stageDisabled = (filtersLoading && !stageSelected) || stageUnavailable;
              if (stageUnavailable) return null;
              return (
                <FilterChipButton
                  key={`${status}-${stage}`}
                  type="button"
                  onClick={() => {
                    if (!isOpen && stageSelected) {
                      onSetSectionOpen(true);
                      return;
                    }
                    onSetSrsStageFilter(stage);
                    closeStatusSectionReliably(onSetSectionOpen);
                  }}
                  disabled={stageDisabled}
                  role="tab"
                  aria-selected={stageSelected}
                  className={isOpen || stageSelected ? "" : "hidden sm:inline-flex"}
                  toneClassName={stageDisabled && !stageSelected ? disabledBadgeClass() : studySrsToneClass(status as Exclude<typeof status, "all">, stageSelected)}
                  label={stage}
                  count={formatNumber(stageCount)}
                />
              );
            }) : null}
          </div>
        );
      })}
    </StudyFilterSection>
  );
}
