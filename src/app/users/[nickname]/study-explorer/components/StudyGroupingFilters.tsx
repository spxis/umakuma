"use client";

import FilterChipButton from "@/app/users/[nickname]/shared/FilterChipButton";

import {
  STUDY_GROUPING_FILTERS,
  STUDY_PANEL_TEXT,
  STUDY_TYPE_FILTERS,
  studyGroupingToneClass,
} from "./StudyExplorer.constants";
import StudyFilterSection from "./StudyFilterSection";
import type { StudyTypeFilter } from "../lib/studyExplorerTypes";

/**
 * The radical / kanji / vocabulary row of the study filters.
 *
 * Lifted out of the panel unchanged. The panel was sitting on the 500-line
 * gate, so the next thing it needed - somewhere to send a bulk selection - had
 * nowhere to go; this is the section that came out most cleanly, because it
 * only ever read four things and called two.
 */
export default function StudyGroupingFilters({
  typeFilter,
  typeCounts,
  allTypeCount,
  allTypesSelected,
  filtersLoading,
  hasData,
  sectionOpen,
  onToggleSection,
  onSetSectionOpen,
  onSetTypeFilter,
  badgeClass,
  disabledBadgeClass,
  groupingCountLabel,
}: {
  typeFilter: StudyTypeFilter;
  typeCounts: Record<StudyTypeFilter, number>;
  allTypeCount: number;
  allTypesSelected: boolean;
  filtersLoading: boolean;
  hasData: boolean;
  sectionOpen: boolean;
  onToggleSection: () => void;
  onSetSectionOpen: (open: boolean) => void;
  onSetTypeFilter: (type: StudyTypeFilter) => void;
  badgeClass: (selected: boolean) => string;
  disabledBadgeClass: () => string;
  groupingCountLabel: (count: number) => string;
}) {
  return (
    <StudyFilterSection
      title={STUDY_PANEL_TEXT.grouping}
      isOpen={sectionOpen}
      onToggle={() => onToggleSection()}
      ariaLabel={STUDY_PANEL_TEXT.groupingFilters}
    >
        <FilterChipButton
          type="button"
          onClick={() => {
            if (!sectionOpen && allTypesSelected) {
              onSetSectionOpen(true);
              return;
            }
            onSetSectionOpen(false);
            onSetTypeFilter(STUDY_TYPE_FILTERS.all);
          }}
          disabled={filtersLoading}
          role="tab"
          aria-selected={allTypesSelected}
          className={sectionOpen || allTypesSelected ? "" : "hidden sm:inline-flex"}
          toneClassName={filtersLoading && !allTypesSelected ? disabledBadgeClass() : badgeClass(allTypesSelected)}
          label={STUDY_PANEL_TEXT.all}
          count={groupingCountLabel(allTypeCount)}
        />
        {STUDY_GROUPING_FILTERS.map(([type, label]) => {
          const count = typeCounts[type];
          const isSelected = typeFilter === type || (allTypesSelected && count > 0);
          const unavailable = hasData && !isSelected && count === 0;
          const disabled = (filtersLoading && !isSelected) || unavailable;
          return (
            <FilterChipButton
              key={type}
              type="button"
              onClick={() => {
                if (!sectionOpen && isSelected) {
                  onSetSectionOpen(true);
                  return;
                }
                onSetSectionOpen(false);
                onSetTypeFilter(type);
              }}
              disabled={disabled}
              role="tab"
              aria-selected={isSelected}
              className={sectionOpen || typeFilter === type ? "" : "hidden sm:inline-flex"}
              toneClassName={disabled && !isSelected ? disabledBadgeClass() : studyGroupingToneClass(type, isSelected)}
              label={label}
              count={groupingCountLabel(count)}
            />
          );
        })}
    </StudyFilterSection>
  );
}
