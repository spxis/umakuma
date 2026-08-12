import { allBadgeClass, badgeClass, disabledBadgeClass, formatNumber, srsFilterButtonLabel } from "../lib/levelExplorerDisplay";
import {
  JLPT_FILTER_ALLOWED,
  LEVEL_JLPT_FILTERS,
  LEVEL_REVIEW_TIMING_FILTERS,
  LEVEL_SRS_FILTERS,
  REVIEW_TIMING_ALLOWED,
  SRS_FILTER_ALLOWED,
} from "../lib/levelExplorerState";
import ExplorerSearchBar from "../../ExplorerSearchBar";
import FilterChipButton from "../../shared/FilterChipButton";
import LevelExplorerLevelFilters from "./LevelExplorerLevelFilters";
import { LEVEL_EXPLORER_JLPT_FILTER_LABELS, LEVEL_EXPLORER_REVIEW_TIMING_LABELS } from "./LevelExplorer.constants";
import type { LevelExplorerFilterPanelProps as Props } from "./LevelExplorerFilterPanel.types";

function wkStatusToneClass(status: (typeof SRS_FILTER_ALLOWED)[number], active: boolean): string {
  if (status === LEVEL_SRS_FILTERS.apprentice) return active ? "border-pink-300 bg-pink-100 text-pink-700" : "border-pink-200 bg-pink-50/70 text-pink-700 hover:bg-pink-100";
  if (status === LEVEL_SRS_FILTERS.guru) return active ? "border-violet-300 bg-violet-100 text-violet-700" : "border-violet-200 bg-violet-50/70 text-violet-700 hover:bg-violet-100";
  if (status === LEVEL_SRS_FILTERS.master) return active ? "border-sky-300 bg-sky-100 text-sky-700" : "border-sky-200 bg-sky-50/70 text-sky-700 hover:bg-sky-100";
  if (status === LEVEL_SRS_FILTERS.enlightened) return active ? "border-amber-300 bg-amber-100 text-amber-700" : "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100";
  return active ? "border-line bg-surface-muted text-foreground" : "border-line bg-surface text-foreground/75 hover:bg-surface-muted";
}

export default function LevelExplorerFilterPanel({
  levelOptions,
  levelItemCountsByLevel,
  selectedLevels,
  searchAvailableLevels,
  visibleTypes,
  counts,
  jlptCounts,
  reviewTimingCounts,
  accountPendingReviews,
  overdueOutsideSelectedLevels,
  srsFilter,
  jlptFilter,
  reviewTimingFilter,
  onClearAllFilters,
  onSelectAllLevelsAndClearSearch,
  onToggleLevel,
  onEnableAllTypes,
  onToggleTypeVisibility,
  onSetSrsFilter,
  onSetJlptFilter,
  onSetReviewTimingFilter,
}: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-[0_8px_18px_rgba(8,16,36,0.06)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-start">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Filters</p>
          <button type="button" onClick={onClearAllFilters} className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted sm:h-8 sm:text-xs">Clear all</button>
        </div>
        <div className="w-full min-w-0 sm:w-1/2">
          <ExplorerSearchBar scope="level" />
        </div>
      </div>
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LevelExplorerLevelFilters
            levelOptions={levelOptions}
            levelItemCountsByLevel={levelItemCountsByLevel}
            selectedLevels={selectedLevels}
            searchAvailableLevels={searchAvailableLevels}
            onSelectAllLevelsAndClearSearch={onSelectAllLevelsAndClearSearch}
            onToggleLevel={onToggleLevel}
          />
        </div>
        <div className="grid gap-2">
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="Grouping filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Grouping</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <FilterChipButton
                type="button"
                onClick={onEnableAllTypes}
                role="tab"
                aria-selected={visibleTypes.radical && visibleTypes.kanji && visibleTypes.vocabulary}
                toneClassName={badgeClass(visibleTypes.radical && visibleTypes.kanji && visibleTypes.vocabulary)}
                label="All"
                count={counts.all}
              />
              {([
                ["radical", "RADICAL", counts.radical],
                ["kanji", "KANJI", counts.kanji],
                ["vocabulary", "VOCAB", counts.vocabulary],
              ] as const).map(([type, label, count]) => {
                const active = (visibleTypes.radical && visibleTypes.kanji && visibleTypes.vocabulary) || visibleTypes[type];
                const disabled = count === 0 && !active;
                const tone = type === "radical"
                  ? (active ? "border-radical bg-radical text-white" : "border-radical/50 bg-radical/10 text-radical hover:bg-radical/20")
                  : type === "kanji"
                    ? (active ? "border-kanji bg-kanji text-white" : "border-kanji/50 bg-kanji/10 text-kanji hover:bg-kanji/20")
                    : (active ? "border-vocabulary bg-vocabulary text-white" : "border-vocabulary/50 bg-vocabulary/10 text-vocabulary hover:bg-vocabulary/20");
                if (disabled) return null;
                return (
                  <FilterChipButton key={type} type="button" onClick={() => onToggleTypeVisibility(type)} disabled={disabled} role="tab" aria-selected={active} toneClassName={disabled ? disabledBadgeClass() : tone} label={label} count={count} />
                );
              })}
            </div>
          </div>
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="Status filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Status</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {SRS_FILTER_ALLOWED.map((status) => {
                const count = counts[status];
                const disabled = status !== LEVEL_SRS_FILTERS.all && count === 0;
                const active = srsFilter === status;
                if (disabled && !active) return null;
                return (
                  <FilterChipButton key={status} type="button" onClick={() => onSetSrsFilter(status)} disabled={disabled} toneClassName={disabled ? disabledBadgeClass() : status === LEVEL_SRS_FILTERS.all ? badgeClass(active) : wkStatusToneClass(status, active)} label={srsFilterButtonLabel(status)} count={count} />
                );
              })}
            </div>
          </div>
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="JLPT mix filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">JLPT</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {JLPT_FILTER_ALLOWED.map((level) => {
                const count = level === LEVEL_JLPT_FILTERS.all ? counts.all : jlptCounts[level];
                const disabled = level !== LEVEL_JLPT_FILTERS.all && count === 0;
                const isJlptLevel = level !== LEVEL_JLPT_FILTERS.all && level !== LEVEL_JLPT_FILTERS.none;
                const active = jlptFilter === level;
                const jlptStyle = active
                  ? "border-teal-500 bg-teal-500 text-white"
                  : "border-teal-300 bg-teal-100 text-teal-800 hover:bg-teal-200";
                if (disabled && !active) {
                  return null;
                }
                return (
                  <FilterChipButton
                    key={level}
                    type="button"
                    onClick={() => onSetJlptFilter(level)}
                    disabled={disabled}
                    toneClassName={disabled ? disabledBadgeClass() : isJlptLevel ? jlptStyle : level === LEVEL_JLPT_FILTERS.all ? badgeClass(active) : allBadgeClass(active)}
                    label={LEVEL_EXPLORER_JLPT_FILTER_LABELS[level]}
                    count={count}
                  />
                );
              })}
            </div>
          </div>
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="Review timing filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Timing</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {REVIEW_TIMING_ALLOWED.map((timing) => {
                const label = LEVEL_EXPLORER_REVIEW_TIMING_LABELS[timing];
                const count = timing === LEVEL_REVIEW_TIMING_FILTERS.all ? counts.all : reviewTimingCounts[timing];
                const disabled = timing !== LEVEL_REVIEW_TIMING_FILTERS.all && count === 0;
                const active = reviewTimingFilter === timing;
                if (disabled && !active) {
                  return null;
                }
                return (
                  <FilterChipButton
                    key={timing}
                    type="button"
                    onClick={() => onSetReviewTimingFilter(timing)}
                    disabled={disabled}
                    toneClassName={disabled ? disabledBadgeClass() : badgeClass(active)}
                    label={label}
                    count={count}
                  />
                );
              })}
            </div>
          </div>
          {reviewTimingFilter === LEVEL_REVIEW_TIMING_FILTERS.overdue && overdueOutsideSelectedLevels > 0 ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/55">
              Showing {formatNumber(reviewTimingCounts.overdue)} overdue in selected levels, with {formatNumber(overdueOutsideSelectedLevels)} more overdue in other levels
              <span className="ml-1 text-[11px] font-semibold text-current/80">({formatNumber(accountPendingReviews)} total pending reviews)</span>.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
