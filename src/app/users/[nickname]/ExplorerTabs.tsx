"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { readExplorerSearch } from "@/lib/explorerSearchParam";

import { arrivesWithSearch } from "./explorerArrivingSearch";
import JlptExplorer from "./jlpt-explorer/components/JlptExplorer";
import LevelExplorer from "./level-explorer/components/LevelExplorer";
import StudyExplorer from "./study-explorer/components/StudyExplorer";
import StudySourceControls from "./StudySourceControls";
import ExplorerTabsStudyQueueMenu from "./ExplorerTabsStudyQueueMenu";
import ExplorerStudyModeMenu from "./ExplorerStudyModeMenu";
import { parseStudyTagFilter, resolveStudyTagFilter } from "./studyTagFilterState";
import { useStudySourceState } from "./useStudySourceState";
import { useStudyModeState } from "./useStudyModeState";
import type { JlptItem, Snapshot, SrsFilter, UserKanjiItem } from "./explorerTypes";
import type {
  StudySrsFilter,
  StudySrsStageFilter,
  StudyTagFilter,
  StudyTypeFilter,
} from "./study-explorer/lib/studyExplorerTypes";
import { QUEUE_TYPES, type QueueType } from "@/lib/domainConstants";

type Props = {
  accountId: string;
  viewedWkUsername: string;
  maxLevel: number;
  accountPendingReviews: number;
  levelItemCountsByLevel: Record<number, number>;
  /** Which explorer this route is. Required: the address decides it. */
  initialTab: "study" | "level" | "jlpt";
  /**
   * Whether the member has a WaniKani connection.
   *
   * Decides which study sources exist for them at all. Defaults to true, which
   * is what every explorer meant before an account could exist without one.
   */
  hasWanikani?: boolean;
  initialQueueMode?: QueueType | null;
  initialStudyMode?: boolean | null;
  initialSnapshot: Snapshot;
  initialSrsFilter: SrsFilter;
  jlptItems: JlptItem[];
  userKanjiItems: UserKanjiItem[];
  initialStudyFilters?: {
    viewedLevel: number | null;
    typeFilter: StudyTypeFilter;
    srsFilter: StudySrsFilter;
    srsStageFilter: StudySrsStageFilter | null;
    recentOnly: boolean;
    showLocked: boolean;
  };
};

export default function ExplorerTabs({
  accountId,
  viewedWkUsername,
  maxLevel,
  accountPendingReviews,
  levelItemCountsByLevel,
  initialTab,
  hasWanikani = true,
  initialQueueMode = null,
  initialStudyMode = null,
  initialSnapshot,
  initialSrsFilter,
  jlptItems,
  userKanjiItems,
  initialStudyFilters,
}: Props) {
  const previousPageKeyRef = useRef<string | null>(null);
  const clientStateHydratedRef = useRef(false);
  const countsStorageKey = `wr:study-queue-counts:${accountId}`;
  const customLibraryNameStorageKey = `wr:study-custom-library-name:${accountId}`;
  const showEnglishStorageKey = `wr:explorer-show-english:${accountId}`;
  const troubleMixStorageKey = `wr:study-trouble-mix-v3:${accountId}`;
  const queueTagFilterStorageKey = `wr:study-queue-tag-filter:${accountId}`;
  const isHydrated = typeof window !== "undefined";
  const {
    studyMode,
    setStudyMode,
    studyModeBehavior,
    setStudyModeBehavior,
    syncFromUrlAndStorage,
    writeToUrl,
  } = useStudyModeState({
    isHydrated,
    initialStudyMode,
    clientStateHydratedRef,
  });
  /*
   * Which explorer this is, decided by the route rather than by state here.
   *
   * These three were one component switching between them in the client, with
   * all three mounted and two hidden by CSS, kept in step with the rest of the
   * page by a `wr:dashboard-tab-change` event. They are three addresses now, so
   * the address is the answer and only one explorer is built.
   */
  const effectiveActiveTab = initialTab;
  const [showEnglish, setShowEnglish] = useState(false);
  const [activeCustomLibraryName, setActiveCustomLibraryName] = useState<string | null>(null);
  const [studySourceModalRequestId, setStudySourceModalRequestId] = useState(0);
  const [queueMode, setQueueMode] = useState<QueueType>(
    initialQueueMode === QUEUE_TYPES.review || initialQueueMode === QUEUE_TYPES.lesson
      ? initialQueueMode
      : QUEUE_TYPES.review,
  );
  const [includeTrouble, setIncludeTrouble] = useState<boolean>(false);
  const [queueTagFilter, setQueueTagFilter] = useState<StudyTagFilter>("all");
  const [reviewedVisible, setReviewedVisible] = useState<boolean | null>(null);
  const [initialViewerMode, setInitialViewerMode] = useState<"detail" | "flash" | null>(null);
  const {
    studySource,
    setStudySource,
    customLibraryId,
    setCustomLibraryId,
    studyCounts,
    applySourceFromSearchParams,
  } = useStudySourceState({ accountId, countsStorageKey, isHydrated, hasWanikani });
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      /* See `arrivesWithSearch`: a search outranks the restored filters. */
      const arrivingWithSearch = arrivesWithSearch(params);

      const urlMode = params.get("mode");
      if (arrivingWithSearch) {
        setQueueMode(QUEUE_TYPES.review);
      } else if (urlMode === QUEUE_TYPES.review || urlMode === QUEUE_TYPES.lesson) {
        setQueueMode(urlMode);
      } else if (initialQueueMode !== QUEUE_TYPES.review && initialQueueMode !== QUEUE_TYPES.lesson) {
        setQueueMode(window.localStorage.getItem(`wr:study-queue-mode:${accountId}`) === QUEUE_TYPES.lesson
          ? QUEUE_TYPES.lesson
          : QUEUE_TYPES.review);
      }

      syncFromUrlAndStorage(params);

      setShowEnglish(window.localStorage.getItem(showEnglishStorageKey) === "1");
      setIncludeTrouble(window.localStorage.getItem(troubleMixStorageKey) === "1");
      const storedLibraryName = window.localStorage.getItem(customLibraryNameStorageKey)?.trim();
      setActiveCustomLibraryName(storedLibraryName ? storedLibraryName : null);
      applySourceFromSearchParams(params);

      const viewer = params.get("viewer");
      setInitialViewerMode(viewer === "detail" || viewer === "flash" ? viewer : null);
      setQueueTagFilter(
        arrivingWithSearch
          ? "all"
          : resolveStudyTagFilter(params, window.localStorage.getItem(queueTagFilterStorageKey)),
      );
      const urlHideLocked = params.get("hideLocked");
      if (arrivingWithSearch || urlHideLocked === "0") {
        setReviewedVisible(true);
      } else if (urlHideLocked === "1") {
        setReviewedVisible(false);
      }
      clientStateHydratedRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    accountId,
    applySourceFromSearchParams,
    initialQueueMode,
    initialStudyMode,
    customLibraryNameStorageKey,
    queueTagFilterStorageKey,
    showEnglishStorageKey,
    syncFromUrlAndStorage,
    troubleMixStorageKey,
  ]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(`wr:study-queue-mode:${accountId}`, queueMode);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [accountId, isHydrated, queueMode]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(troubleMixStorageKey, includeTrouble ? "1" : "0");
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [includeTrouble, isHydrated, troubleMixStorageKey]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }
    try {
      const normalizedName = activeCustomLibraryName?.trim() ?? "";
      if (normalizedName) {
        window.localStorage.setItem(customLibraryNameStorageKey, normalizedName);
      } else {
        window.localStorage.removeItem(customLibraryNameStorageKey);
      }
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [activeCustomLibraryName, customLibraryNameStorageKey, isHydrated]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    const modeInUrl = params.get("mode");
    if (modeInUrl !== queueMode) {
      params.set("mode", queueMode);
      changed = true;
    }
    changed = writeToUrl(params) || changed;
    try {
      window.localStorage.setItem(queueTagFilterStorageKey, queueTagFilter);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
    const tagInUrl = params.get("tag");
    if (queueTagFilter !== "all" && tagInUrl !== queueTagFilter) {
      params.set("tag", queueTagFilter);
      changed = true;
    } else if (queueTagFilter === "all" && tagInUrl !== null) {
      params.delete("tag");
      changed = true;
    }
    if (changed) {
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, "", next);
    }
  }, [
    effectiveActiveTab,
    isHydrated,
    queueMode,
    queueTagFilter,
    queueTagFilterStorageKey,
    studyMode,
    studyModeBehavior,
    writeToUrl,
  ]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    const pageKey = effectiveActiveTab === "study" ? `${effectiveActiveTab}:${queueMode}` : effectiveActiveTab;
    if (previousPageKeyRef.current === null) {
      previousPageKeyRef.current = pageKey;
      return;
    }

    if (previousPageKeyRef.current !== pageKey) {
      window.dispatchEvent(
        new CustomEvent("wr:explorer-page-change", {
          detail: { activeTab: effectiveActiveTab, queueMode },
        }),
      );
      previousPageKeyRef.current = pageKey;
    }
  }, [effectiveActiveTab, isHydrated, queueMode]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(showEnglishStorageKey, showEnglish ? "1" : "0");
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [isHydrated, showEnglish, showEnglishStorageKey]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      if (urlMode === QUEUE_TYPES.review || urlMode === QUEUE_TYPES.lesson) setQueueMode(urlMode);
      syncFromUrlAndStorage(params);
      setQueueTagFilter(parseStudyTagFilter(params.get("tag")) ?? "all");

      applySourceFromSearchParams(params);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [applySourceFromSearchParams, isHydrated, syncFromUrlAndStorage]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const query = readExplorerSearch(params);
    if (!query) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("wr:explorer-search", {
        detail: { query, scope: effectiveActiveTab },
      }),
    );
  }, [effectiveActiveTab, isHydrated]);


  const studySourceHeaderLabel = studySource === "custom"
    ? (activeCustomLibraryName?.trim() || "Custom")
    : "WaniKani";
  const studySourceIsCustom = studySource === "custom";
  const studySourceLevel = studySource === "custom"
    ? (typeof studyCounts?.currentLevel === "number" ? studyCounts.currentLevel : 1)
    : (typeof studyCounts?.currentLevel === "number" ? studyCounts.currentLevel : maxLevel);
  const effectiveStudyMaxLevel = studySource === "custom"
    ? Math.max(
      typeof studyCounts?.maxLevel === "number" ? studyCounts.maxLevel : 1,
      typeof studySourceLevel === "number" ? studySourceLevel : 1,
    )
    : maxLevel;
  /*
   * The library, not the page. This read "Library Explorer - WaniKani" while
   * the page header two rows above already said Library Explorer; what the
   * control actually changes, and the only part that varies, is which library
   * is open.
   */
  const levelExplorerTitle = studySource === "custom" ? studySourceHeaderLabel : "WaniKani";
  const levelExplorerPendingReviews = studySource === "custom"
    ? (typeof studyCounts?.reviews === "number" ? studyCounts.reviews : 0)
    : accountPendingReviews;
  const levelExplorerLevelItemCountsByLevel = studySource === "custom"
    ? {}
    : levelItemCountsByLevel;
  const levelExplorerInitialSnapshot = useMemo(() => {
    if (studySource !== "custom") {
      return initialSnapshot;
    }

    return {
      level: Math.max(1, studySourceLevel),
      kanjiTotal: 0,
      kanjiLearned: 0,
      kanjiGuruPlus: 0,
      kanjiLocked: 0,
      estimatedHoursRemaining: null,
      items: [],
      syncedAt: new Date().toISOString(),
    } as Snapshot;
  }, [initialSnapshot, studySource, studySourceLevel]);
  const levelExplorerKey = `level-explorer:${studySource}:${customLibraryId ?? "none"}:${studySource === "custom" ? effectiveStudyMaxLevel : maxLevel}`;
  const openStudySourceManager = () => {
    setStudySourceModalRequestId((current) => current + 1);
  };
  const handleSetReviewedVisible = (visible: boolean) => {
    setReviewedVisible(visible);
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("hideLocked", visible ? "0" : "1");
    const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, "", next);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <section className="space-y-3">
      <StudySourceControls
        accountId={accountId}
        viewedWkUsername={viewedWkUsername}
        hasWanikani={hasWanikani}
        studySource={studySource}
        onSetStudySource={setStudySource}
        customLibraryId={customLibraryId}
        onSetCustomLibraryId={setCustomLibraryId}
        onActiveLibraryNameChange={setActiveCustomLibraryName}
        openRequestId={studySourceModalRequestId}
      />
      <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <div className="w-full md:col-start-2">
          <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto md:justify-end">
            {effectiveActiveTab === "study" ? (
              <ExplorerTabsStudyQueueMenu
                queueMode={queueMode}
                queueTagFilter={queueTagFilter}
                includeTrouble={includeTrouble}
                studyMode={studyMode}
                reviewedVisible={reviewedVisible === true}
                studyCounts={studyCounts}
                onSetQueueMode={setQueueMode}
                onSetQueueTagFilter={setQueueTagFilter}
                onSetIncludeTrouble={setIncludeTrouble}
                onSetReviewedVisible={handleSetReviewedVisible}
              />
            ) : null}
            <ExplorerStudyModeMenu
              studyMode={studyMode}
              studyModeBehavior={studyModeBehavior}
              onSelectMode={(mode) => {
                if (mode === "game") {
                  window.location.assign(`/users/${encodeURIComponent(viewedWkUsername)}/game`);
                  return;
                }
                setStudyModeBehavior(mode);
                setStudyMode(true);
              }}
              onTurnOff={() => setStudyMode(false)}
            />
          </div>
        </div>
      </div>

      {effectiveActiveTab === "study" ? (
        <StudyExplorer
          accountId={accountId}
          studySource={studySource}
          customLibraryId={customLibraryId}
          studySourceHeaderLabel={studySourceHeaderLabel}
          studySourceIsCustom={studySourceIsCustom}
          studySourceLevel={studySourceLevel}
          onOpenStudySourceManager={openStudySourceManager}
          maxLevel={effectiveStudyMaxLevel}
          initialViewerMode={initialViewerMode}
          initialFilters={initialStudyFilters}
          showEnglish={showEnglish}
          onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
          canToggleEnglish
          studyMode={studyMode}
          studyModeBehavior={studyModeBehavior}
          queueMode={queueMode}
          includeTrouble={includeTrouble}
          queueTagFilter={queueTagFilter}
          onClearQueueTagFilter={() => setQueueTagFilter("all")}
          onReviewedVisibilityChange={(visible) => setReviewedVisible(visible)}
        />
      ) : null}

      {effectiveActiveTab === "level" ? (
        <LevelExplorer
          key={levelExplorerKey}
          accountId={accountId}
          isActive={effectiveActiveTab === "level"}
          explorerTitle={levelExplorerTitle}
          onOpenStudySourceManager={openStudySourceManager}
          explorerSource={studySource}
          customLibraryId={customLibraryId}
          maxLevel={studySource === "custom" ? effectiveStudyMaxLevel : maxLevel}
          accountPendingReviews={levelExplorerPendingReviews}
          levelItemCountsByLevel={levelExplorerLevelItemCountsByLevel}
          initialSnapshot={levelExplorerInitialSnapshot}
          initialSrsFilter={initialSrsFilter}
          showEnglish={showEnglish}
          canToggleEnglish
          onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
          studyMode={studyMode}
        />
      ) : null}

      {effectiveActiveTab === "jlpt" ? (
        <JlptExplorer
          accountId={accountId}
          isActive={effectiveActiveTab === "jlpt"}
          items={jlptItems}
          showEnglish={showEnglish}
          canToggleEnglish
          onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
          studyMode={studyMode}
          userKanjiItems={userKanjiItems}
        />
      ) : null}
    </section>
  );
}
