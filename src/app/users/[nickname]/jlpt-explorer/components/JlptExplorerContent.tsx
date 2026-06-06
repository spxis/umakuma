import { Fragment, useEffect, useRef, useState } from "react";
import jlptReadings from "@/data/jlptReadings.json";
import UnifiedExplorerCard from "../../shared/UnifiedExplorerCard";
import { allBadgeClass, badgeClass, jlptLevelPillClass } from "../../level-explorer/lib/levelExplorerDisplay";
import {
  formatNumber,
  jlptHeading,
  readingLabel,
  readingLabelFromList,
} from "../lib/jlptDisplay";
import { JLPT_EXPLORER_TEXT } from "./JlptExplorer.constants";
import { jlptStatusClass } from "../lib/jlptExplorerContentHelpers";
import ExplorerSearchBar from "../../ExplorerSearchBar";
import FilterChipLabel from "../../shared/FilterChipLabel";
import JlptExplorerDetailSection from "./JlptExplorerDetailSection";
import type {
  KanjiStats,
  JlptExplorerContentProps as Props,
  JlptReadingsRecord,
} from "./JlptExplorerContent.types";
export default function JlptExplorerContent({
  items,
  showEnglish,
  canToggleEnglish = true,
  onToggleShowEnglish,
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
  const PAGE_SIZE = 40;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const selectedIndex = selectedItem
    ? filteredItems.findIndex((item) => item.kanji === selectedItem.kanji)
    : -1;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    try {
      const stored = window.localStorage.getItem("wr:jlpt:mobile-filters-open");
      return stored === null ? true : stored === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem("wr:jlpt:mobile-filters-open", mobileFiltersOpen ? "1" : "0");
    } catch {
      // Ignore storage access errors in restricted modes.
    }
  }, [mobileFiltersOpen]);

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
  const mobileFilterSectionClass = mobileFiltersOpen ? "block" : "hidden";
  return (
    <>
    <section className="overflow-hidden rounded-[2rem] border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <header className="border-b border-line bg-surface/90 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-foreground">JLPT Explorer</h2>
            <p className="text-xs uppercase tracking-[0.08em] text-foreground/70">
              <FilterChipLabel label="Browse all N1-N5 kanji" count={`${formatNumber(items.length)} total`} />
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="jlpt-filters-panel"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold leading-none text-foreground"
          >
            {mobileFiltersOpen ? JLPT_EXPLORER_TEXT.hideFilters : JLPT_EXPLORER_TEXT.showFilters}
          </button>
        </div>
        <div id="jlpt-filters-panel" className={`mt-3 ${mobileFilterSectionClass}`}>
          <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-[0_8px_18px_rgba(8,16,36,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Filters</p>
              <div className="w-full md:w-1/2">
                <ExplorerSearchBar scope="jlpt" />
              </div>
            </div>
            <div className="mt-2 space-y-2">
          {availableWkLevels.length > 0 ? (
            <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="WaniKani level filters">
              <span className="px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Level</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                <button type="button" onClick={() => onSetWkLevelFilter(null)} className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${allBadgeClass(wkLevelFilter === null)}`}>
                  <FilterChipLabel label="All" count={formatNumber(items.length)} />
                </button>
                <button type="button" onClick={() => onSetWkLevelFilter(wkLevelFilter === "none" ? null : "none")} className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${badgeClass(wkLevelFilter === "none")}`}>
                  <FilterChipLabel label={JLPT_EXPLORER_TEXT.none} count={formatNumber(wkLevelCounts.get("none") ?? 0)} />
                </button>
                {availableWkLevels.map((level) => (
                  <button key={level} type="button" onClick={() => onSetWkLevelFilter(wkLevelFilter === level ? null : level)} className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${badgeClass(wkLevelFilter === level)}`}>
                    <FilterChipLabel label={level} count={formatNumber(wkLevelCounts.get(level) ?? 0)} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {availableGrades.length > 0 ? (
            <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="School grade filters">
              <span className="px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Grade</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <button type="button" onClick={() => onSetGradeFilter(null)} className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${allBadgeClass(gradeFilter === null)}`}>
                All
              </button>
              {gradeCounts.has("none") ? (
                <button
                  type="button"
                  onClick={() => onSetGradeFilter(gradeFilter === "none" ? null : "none")}
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${badgeClass(
                    gradeFilter === "none",
                  )}`}
                >
                  <FilterChipLabel label="None" count={formatNumber(gradeCounts.get("none") ?? 0)} />
                </button>
              ) : null}
              {availableGrades.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => onSetGradeFilter(gradeFilter === grade ? null : grade)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${badgeClass(
                    gradeFilter === grade,
                  )}`}
                >
                  <FilterChipLabel label={`G${grade}`} count={formatNumber(gradeCounts.get(grade) ?? 0)} />
                </button>
              ))}
              </div>
            </div>
          ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="JLPT level filters">
            <span className="px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">JLPT</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onSetSelectedLevels(new Set([1, 2, 3, 4, 5]))}
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${allBadgeClass(
                selectedLevels.size === 5,
              )}`}
            >
              <FilterChipLabel label="All" count={formatNumber(counts.all)} />
            </button>
            {([
              [5, counts.n5],
              [4, counts.n4],
              [3, counts.n3],
              [2, counts.n2],
              [1, counts.n1],
            ] as const).map(([level, count]) => (
              <button
                key={level}
                type="button"
                onClick={() => onToggleNLevel(level)}
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${
                  selectedLevels.has(level)
                    ? "border-teal-500 bg-teal-500 text-white"
                    : "border-teal-300 bg-teal-100 text-teal-800 hover:bg-teal-200"
                }`}
              >
                <FilterChipLabel label={`N${level}`} count={formatNumber(count)} />
              </button>
            ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {onToggleShowEnglish ? (
              <button
                type="button"
                onClick={onToggleShowEnglish}
                disabled={!canToggleEnglish}
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {canToggleEnglish ? (showEnglish ? JLPT_EXPLORER_TEXT.hideEnglish : JLPT_EXPLORER_TEXT.showEnglish) : JLPT_EXPLORER_TEXT.hintsHidden}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onSetStickyLevels(!stickyLevels)}
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${
                stickyLevels ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground"
              }`}
            >
              {stickyLevels ? JLPT_EXPLORER_TEXT.stickyOn : JLPT_EXPLORER_TEXT.stickyOff}
            </button>
          </div>
        </div>
            </div>
          </div>
        </div>
      </header>
    </section>
    <section className="mt-3 overflow-hidden rounded-[2rem] border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <div className="p-5">
        {isLoadingData ? (
          <div className="mb-3 rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-foreground/75">
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              <span>Loading JLPT explorer...</span>
            </div>
          </div>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70">
          Showing {formatNumber(visibleItems.length)} of {formatNumber(filteredItems.length)} results
        </p>
        <p className="mt-1 text-xs text-foreground/60">
          WaniKani-specific SRS stats are shown only where subject mappings exist.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  onClick={() => onSetSelectedKanji((prev) => (prev === item.kanji ? null : item.kanji))}
                  className={`rounded-2xl border p-3 text-left transition hover:brightness-95 ${
                    userMatch ? "border-kanji/50 bg-surface text-foreground" : "border-line bg-surface text-foreground"
                  } ${selectedKanji === item.kanji ? "ring-2 ring-accent" : ""}`}
                  indexLabel={`#${index + 1}`}
                  topRight={
                    <>
                      {typeof userMatch?.wkLevel === "number" ? (
                        <span className="subject-pill border-line bg-surface text-foreground">L{userMatch.wkLevel}</span>
                      ) : null}
                      {typeof item.schoolGrade === "number" ? (
                        <span className="subject-pill border-line bg-surface text-foreground">G{item.schoolGrade}</span>
                      ) : null}
                      <span className={jlptLevelPillClass()}>N{item.nLevel}</span>
                    </>
                  }
                  glyphClassName={`border-kanji/50 bg-kanji/10 ${userMatch ? "text-kanji" : "text-foreground"}`}
                  glyphText={item.kanji}
                  glyphTextClassName="text-6xl"
                  glyphSubtitle={
                    studyMode
                      ? <span className="text-foreground/45">...</span>
                      : showEnglish
                        ? heading
                        : primaryReading
                          ? readingLabel(primaryReading, showEnglish)
                          : readingLabelFromList(fallbackReadings, showEnglish)
                  }
                  statusChip={
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${jlptStatusClass(userMatch?.status)}`}>
                      {userMatch?.status ?? "untracked"}
                    </span>
                  }
                  rightChip={
                    <span className="rounded-full border border-line bg-surface px-2 py-1 text-xs font-bold text-foreground">
                      {userMatch ? `SRS ${userMatch.srsStage ?? 0}` : "-"}
                    </span>
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
