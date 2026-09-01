import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

/** Grid or list on the JLPT explorer, remembered per surface. */
const JLPT_VIEW_MODE_STORAGE_KEY = "wr:jlpt-explorer:view-mode";

/**
 * The test before 2010, for people who sat it.
 *
 * Four levels counting down, and both schemes number downward, so an old
 * Level 4 is the beginner paper and maps to N5 - not to N4, which is the trap.
 * N3 has no old equivalent at all: it was added to bridge old Levels 3 and 2,
 * which is why these chips do not cover the whole catalogue and the note below
 * them says so rather than quietly mapping N3 somewhere it never sat.
 */
const CLASSIC_LEVEL_CHIPS = [
  { classic: 4, modern: 5 },
  { classic: 3, modern: 4 },
  { classic: 2, modern: 2 },
  { classic: 1, modern: 1 },
] as const;
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import jlptReadings from "@/data/jlptReadings.json";
import UnifiedExplorerCard from "../../shared/UnifiedExplorerCard";
import { badgeClass, jlptLevelPillClass } from "../../level-explorer/lib/levelExplorerDisplay";
import {
  formatNumber,
  jlptHeading,
  readingLabel,
  readingLabelFromList,
} from "../lib/jlptDisplay";
import { JLPT_EXPLORER_TEXT } from "./JlptExplorer.constants";
import { jlptStatusClass } from "../lib/jlptExplorerContentHelpers";
import ExplorerSearchBar from "../../ExplorerSearchBar";
import ExplorerFilterToggleButton from "../../shared/ExplorerFilterToggleButton";
import ExplorerSplitLoadingShimmer from "../../shared/ExplorerSplitLoadingShimmer";
import FilterChipLabel from "../../shared/FilterChipLabel";
import FilterChipButton from "../../shared/FilterChipButton";
import { ExplorerPill, NeutralPill } from "../../shared/ExplorerPill";
import JlptExplorerDetailSection from "./JlptExplorerDetailSection";
import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import { usePersistedBoolean } from "@/lib/usePersistedBoolean";
import FieldLabel from "../../../../shared/FieldLabel";
import StudyTagListsButton from "@/app/shared/StudyTagListsButton";
import KanjiSelectionBar from "@/app/shared/KanjiSelectionBar";
import { SubjectSelectionToggle } from "@/app/shared/SubjectSelectionControls";
import { useSubjectSelection } from "@/app/shared/useSubjectSelection";
import { usePathname } from "next/navigation";
import type {
  KanjiStats,
  JlptExplorerContentProps as Props,
  JlptReadingsRecord,
} from "./JlptExplorerContent.types";
export default function JlptExplorerContent({
  accountId,
  items,
  showEnglish,
  studyMode,
  counts,
  selectedLevels,
  stickyLevels,
  wkLevelFilter,
  availableWkLevels,
  wkLevelCounts,
  gradeFilter,
  availableGrades,
  gradeCounts,
  filteredItems,
  selectedKanji,
  selectedItem,
  gridColumns,
  userKanjiByChar,
  isLoadingData,
  isLoadingMore,
  hasMoreRemote,
  onLoadMoreRemote,
  onSetSelectedLevels,
  onToggleNLevel,
  onSetWkLevelFilter,
  onSetGradeFilter,
  onSetStickyLevels,
  onSetSelectedKanji,
}: Props) {
  /* Remembered per surface, like the other listing pages. */
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(JLPT_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid));
  const [showClassic, setShowClassic] = useState(false);

  /*
   * Choosing, the same way the grade explorer does it. The practice sheet
   * lives under the member whose page this is, which the address already
   * names - the explorer is not given a nickname of its own.
   */
  const selection = useSubjectSelection("jlpt");
  const pathname = usePathname();
  const practicePath = `${(pathname ?? "").split("/").slice(0, 3).join("/")}/practice`;

  const PAGE_SIZE = 40;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const selectedIndex = selectedItem
    ? filteredItems.findIndex((item) => item.kanji === selectedItem.kanji)
    : -1;
  const [mobileFiltersOpen, setMobileFiltersOpen] = usePersistedBoolean("wr:jlpt:mobile-filters-open", {
    defaultValue: true,
    mode: "one-is-true",
  });
  const hasMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  // --- Kanji stats/history state ---
  const [statsOpen, setStatsOpen] = useState(false);
  const [kanjiStats, setKanjiStats] = useState<KanjiStats | null>(null);
  const [kanjiStatsLoading, setKanjiStatsLoading] = useState(false);
  const [kanjiStatsError, setKanjiStatsError] = useState<string | null>(null);
  // Account ID is not in props, so try to extract from location (fragile fallback)
  function getAccountIdFromUrl() {
    if (typeof window === "undefined") return null;
    const m = window.location.pathname.match(/\/users\/([^/]+)/);
    return m ? m[1] : null;
  }
  useEffect(() => {
    if (!selectedItem) return;
    const selectedSubjectId = userKanjiByChar.get(selectedItem.kanji)?.subjectId;
    if (!selectedSubjectId) return;
    const accountId = getAccountIdFromUrl();
    if (!accountId) return;
    queueMicrotask(() => {
      setKanjiStatsLoading(true);
      setKanjiStatsError(null);
    });
    fetch(`/api/study/${accountId}/subjects/${selectedSubjectId}/history?refresh=1`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data) => {
        const payload = data as { history?: KanjiStats };
        setKanjiStats(payload.history || null);
        setKanjiStatsLoading(false);
      })
      .catch(() => {
        setKanjiStatsError("Could not load kanji stats");
        setKanjiStatsLoading(false);
      });
  }, [selectedItem, userKanjiByChar]);
  const effectiveVisibleCount = Math.min(
    filteredItems.length,
    Math.max(PAGE_SIZE, visibleCount, selectedIndex + 1),
  );
  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }
    if (effectiveVisibleCount >= filteredItems.length) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }
        setVisibleCount((prev) => Math.min(filteredItems.length, prev + PAGE_SIZE));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [effectiveVisibleCount, filteredItems.length]);

  useEffect(() => {
    if (!hasMoreRemote || isLoadingMore || isLoadingData || filteredItems.length > 0) {
      return;
    }

    void onLoadMoreRemote();
  }, [filteredItems.length, hasMoreRemote, isLoadingData, isLoadingMore, onLoadMoreRemote]);

  const visibleItems = filteredItems.slice(0, effectiveVisibleCount);
  const selectedVisibleIndex = selectedItem
    ? visibleItems.findIndex((item) => item.kanji === selectedItem.kanji)
    : -1;
  const visibleDetailInsertIndex =
    selectedVisibleIndex >= 0
      ? Math.min(
          visibleItems.length - 1,
          Math.floor(selectedVisibleIndex / gridColumns) * gridColumns + (gridColumns - 1),
        )
      : -1;
  const effectiveMobileFiltersOpen = hasMounted ? mobileFiltersOpen : true;
  const mobileFilterSectionClass = effectiveMobileFiltersOpen ? "block" : "hidden";
  return (
    <>
    <section className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <header className="border-b border-line bg-surface/90 px-5 py-4">
        <div className="grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3">
          <div className="order-2 min-w-0 sm:order-1">
            <h2 className="text-xl font-black text-foreground">JLPT Explorer</h2>
            <p className="text-xs uppercase tracking-[0.08em] text-foreground/70">
              <FilterChipLabel label="Browse all N1-N5 kanji" count={`${formatNumber(items.length)} total`} />
            </p>
          </div>
          <div className="order-1 flex items-center justify-end gap-2 sm:order-2 sm:justify-start">
            <StudyTagListsButton accountId={accountId} size="sm" />
            <ExplorerFilterToggleButton
              expanded={effectiveMobileFiltersOpen}
              onToggle={() => setMobileFiltersOpen((open) => !open)}
              controlsId="jlpt-filters-panel"
              showLabel={JLPT_EXPLORER_TEXT.showFilters}
              hideLabel={JLPT_EXPLORER_TEXT.hideFilters}
            />
          </div>
        </div>
        <div id="jlpt-filters-panel" className={`mt-3 ${mobileFilterSectionClass}`}>
          <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-[0_8px_18px_rgba(8,16,36,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Filters</FieldLabel>
              <div className="w-full md:w-1/2">
                <ExplorerSearchBar scope="jlpt" />
              </div>
            </div>
            <div className="mt-2 space-y-2">
          {availableWkLevels.length > 0 ? (
            <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="WaniKani level filters">
              <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Level</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                <FilterChipButton type="button" onClick={() => onSetWkLevelFilter(null)} toneClassName={badgeClass(wkLevelFilter === null)} label="All" count={formatNumber(items.length)} />
                <FilterChipButton type="button" onClick={() => onSetWkLevelFilter(wkLevelFilter === "none" ? null : "none")} toneClassName={badgeClass(wkLevelFilter === "none")} label={JLPT_EXPLORER_TEXT.none} count={formatNumber(wkLevelCounts.get("none") ?? 0)} />
                {availableWkLevels.map((level) => (
                  <FilterChipButton key={level} type="button" onClick={() => onSetWkLevelFilter(wkLevelFilter === level ? null : level)} toneClassName={badgeClass(wkLevelFilter === level)} label={level} count={formatNumber(wkLevelCounts.get(level) ?? 0)} />
                ))}
              </div>
            </div>
          ) : null}
          {availableGrades.length > 0 ? (
            <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="School grade filters">
              <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Grade</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <FilterChipButton type="button" onClick={() => onSetGradeFilter(null)} toneClassName={badgeClass(gradeFilter === null)} label="All" />
              {gradeCounts.has("none") ? (
                <FilterChipButton
                  type="button"
                  onClick={() => onSetGradeFilter(gradeFilter === "none" ? null : "none")}
                  toneClassName={badgeClass(gradeFilter === "none")}
                  label="None"
                  count={formatNumber(gradeCounts.get("none") ?? 0)}
                />
              ) : null}
              {availableGrades.map((grade) => (
                <FilterChipButton
                  key={grade}
                  type="button"
                  onClick={() => onSetGradeFilter(gradeFilter === grade ? null : grade)}
                  toneClassName={badgeClass(gradeFilter === grade)}
                  label={`G${grade}`}
                  count={formatNumber(gradeCounts.get(grade) ?? 0)}
                />
              ))}
              </div>
            </div>
          ) : null}
        {showClassic ? (
          <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
            The test ran four levels until 2009, counting down like today, so Level 4 is the
            beginner paper and matches N5. N3 has no equivalent - it was added in 2010 to bridge
            old Levels 3 and 2 - so these four do not reach every kanji.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="JLPT level filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">JLPT</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <FilterChipButton type="button" onClick={() => onSetSelectedLevels(new Set([1, 2, 3, 4, 5]))} toneClassName={badgeClass(selectedLevels.size === 5)} label="All" count={formatNumber(counts.all)} />
            {showClassic
              ? CLASSIC_LEVEL_CHIPS.map(({ classic, modern }) => (
                  <FilterChipButton
                    key={classic}
                    type="button"
                    onClick={() => onToggleNLevel(modern)}
                    toneClassName={
                      selectedLevels.has(modern)
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                    }
                    label={`Level ${classic}`}
                    count={`N${modern}`}
                  />
                ))
              : ([
                  [5, counts.n5],
                  [4, counts.n4],
                  [3, counts.n3],
                  [2, counts.n2],
                  [1, counts.n1],
                ] as const).map(([level, count]) => (
                  <FilterChipButton
                    key={level}
                    type="button"
                    onClick={() => onToggleNLevel(level)}
                    toneClassName={
                      selectedLevels.has(level)
                        ? "border-teal-500 bg-teal-500 text-white"
                        : "border-teal-300 bg-teal-100 text-teal-800 hover:bg-teal-200"
                    }
                    label={`N${level}`}
                    count={formatNumber(count)}
                  />
                ))}

            <button
              type="button"
              onClick={() => setShowClassic((on) => !on)}
              title={
                showClassic
                  ? "Show the levels used since 2010"
                  : "Show the four levels used until 2009"
              }
              className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-[11px] font-bold text-foreground/70 transition hover:bg-surface-muted"
            >
              {showClassic ? "N5-N1" : "Pre-2010"}
            </button>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <FilterChipButton
              type="button"
              onClick={() => onSetStickyLevels(!stickyLevels)}
              toneClassName={stickyLevels ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground"}
              label={stickyLevels ? JLPT_EXPLORER_TEXT.stickyOn : JLPT_EXPLORER_TEXT.stickyOff}
            />
          </div>
        </div>
            </div>
          </div>
        </div>
      </header>
    </section>
    <section className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <div className="p-5">
        {isLoadingData ? (
          <div className="mb-3">
            <ExplorerSplitLoadingShimmer label="Loading JLPT explorer..." cardCount={8} />
          </div>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70">
              Showing {formatNumber(visibleItems.length)} of {formatNumber(filteredItems.length)} results
            </p>
            <p className="mt-1 text-xs text-foreground/60">
              WaniKani-specific SRS stats are shown only where subject mappings exist.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SubjectSelectionToggle selection={selection} />
            <SubjectViewModeToggle
              value={viewMode}
              onChange={(next) => {
                setViewMode(next);
                setStoredEnum(JLPT_VIEW_MODE_STORAGE_KEY, next);
              }}
            />
          </div>
        </div>

        <div className="mt-3">
          <KanjiSelectionBar
            selection={selection}
            visibleKeys={visibleItems.map((entry) => entry.kanji)}
            accountId={accountId}
            practicePath={practicePath}
          />
        </div>
        <div className={viewMode === SUBJECT_VIEW_MODES.list ? "mt-3 space-y-1.5" : "mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
          {visibleItems.map((item, index) => {
            const userMatch = userKanjiByChar.get(item.kanji);
            const preload = (jlptReadings as JlptReadingsRecord)[item.kanji];
            const dbReadings = [...item.kunReadings, ...item.onReadings, ...item.nanoriReadings];
            const primaryReading = userMatch
              ? (userMatch.primaryReadings ?? [])[0] ?? (userMatch.readings ?? [])[0] ?? null
              : dbReadings[0] ?? null;
            const fallbackReadings = dbReadings.length > 0 ? dbReadings : (preload?.readings ?? []);
            const fallbackMeanings = item.meanings.length > 0 ? item.meanings : (preload?.meanings ?? []);
            const heading = jlptHeading(item.primaryMeaning, userMatch?.meanings, fallbackMeanings, item.kanji);
            return (
              <Fragment key={`${item.nLevel}-${item.kanji}`}>
                <UnifiedExplorerCard
                  density={viewMode}
                  chosen={selection.choosing && selection.chosen.has(item.kanji)}
                  onClick={(meta) => {
                    /*
                     * Choosing borrows the card's click, the way the grade
                     * grid does - the same click, a different verb - so the
                     * grid needs no second target and no permanent checkbox.
                     */
                    if (selection.choosing) {
                      const order = visibleItems.map((entry) => entry.kanji);
                      if (meta?.shiftKey) selection.extendTo(item.kanji, order);
                      else selection.toggle(item.kanji);
                      return;
                    }
                    onSetSelectedKanji((prev) => (prev === item.kanji ? null : item.kanji));
                  }}
                  className={`rounded-2xl border p-3 text-left transition hover:brightness-95 ${
                    userMatch ? "border-kanji/50 bg-surface text-foreground" : "border-line bg-surface text-foreground"
                  } ${selectedKanji === item.kanji ? "ring-2 ring-accent" : ""}`}
                  indexLabel={`#${index + 1}`}
                  topRight={
                    <>
                      {typeof item.schoolGrade === "number" ? (
                        <NeutralPill>G{item.schoolGrade}</NeutralPill>
                      ) : null}
                      <ExplorerPill className={jlptLevelPillClass()}>{`N${item.nLevel}`}</ExplorerPill>
                    </>
                  }
                  glyphClassName={`border-kanji/50 bg-kanji/10 ${userMatch ? "text-kanji" : "text-foreground"}`}
                  glyphText={item.kanji}
                  glyphTextClassName="text-6xl"
                  glyphOverlay={
                    <GlyphMetadataBadges
                      level={userMatch?.wkLevel}
                      successRate={userMatch?.successRate}
                    />
                  }
                  glyphSubtitle={
                    studyMode
                      ? <span className="text-foreground/60">...</span>
                      : showEnglish
                        ? heading
                        : primaryReading
                          ? readingLabel(primaryReading, showEnglish)
                          : readingLabelFromList(fallbackReadings, showEnglish)
                  }
                  statusChip={
                    <ExplorerPill className={`px-3 py-1 text-xs font-bold ${jlptStatusClass(userMatch?.status)}`}>
                      {userMatch?.status ?? "untracked"}
                    </ExplorerPill>
                  }
                  rightChip={
                    <NeutralPill className="px-2 py-1 text-xs font-bold">
                      {userMatch ? `SRS ${userMatch.srsStage ?? 0}` : "-"}
                    </NeutralPill>
                  }
                />
                {selectedItem && index === visibleDetailInsertIndex ? (
                  <JlptExplorerDetailSection
                    selectedItem={selectedItem}
                    showEnglish={showEnglish}
                    studyMode={studyMode}
                    userKanjiByChar={userKanjiByChar}
                    statsOpen={statsOpen}
                    kanjiStats={kanjiStats}
                    kanjiStatsLoading={kanjiStatsLoading}
                    kanjiStatsError={kanjiStatsError}
                    onToggleStatsOpen={() => setStatsOpen((value) => !value)}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </div>
        {visibleItems.length < filteredItems.length ? (
          <div ref={sentinelRef} className="mt-3 rounded-xl border border-line bg-surface-muted px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-foreground/60">
            Loading more...
          </div>
        ) : null}
        {visibleItems.length >= filteredItems.length && hasMoreRemote ? (
          <button
            type="button"
            onClick={() => {
              void onLoadMoreRemote();
            }}
            disabled={isLoadingMore}
            className="mt-3 w-full rounded-xl border border-line bg-surface-muted px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading more JLPT items..." : "Load more JLPT items"}
          </button>
        ) : null}
      </div>
    </section>
    </>
  );
}
