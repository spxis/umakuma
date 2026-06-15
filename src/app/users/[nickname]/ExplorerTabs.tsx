"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import JlptExplorer from "./jlpt-explorer/components/JlptExplorer";
import LevelExplorer from "./level-explorer/components/LevelExplorer";
import StudyExplorer from "./study-explorer/components/StudyExplorer";
import StudySourceControls from "./StudySourceControls";
import ExplorerTabsStudyQueueMenu from "./ExplorerTabsStudyQueueMenu";
import { parseStudyTagFilter, resolveStudyTagFilter } from "./studyTagFilterState";
import { useStudySourceState } from "./useStudySourceState";
import type { JlptItem, Snapshot, SrsFilter, UserKanjiItem } from "./explorerTypes";
import type { StudySrsFilter, StudySrsStageFilter, StudyTagFilter, StudyTypeFilter } from "./study-explorer/lib/studyExplorerTypes";
import { QUEUE_TYPES, type QueueType } from "@/lib/domainConstants";

type Props = {
  accountId: string;
  viewedWkUsername: string;
  maxLevel: number;
  accountPendingReviews: number;
  levelItemCountsByLevel: Record<number, number>;
  initialTab?: "study" | "level" | "jlpt";
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
  initialTab = "study",
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
  const troubleMixStorageKey = `wr:study-trouble-mix:${accountId}`;
  const queueTagFilterStorageKey = `wr:study-queue-tag-filter:${accountId}`;
  const isHydrated = typeof window !== "undefined";
  const [dashboardTab, setDashboardTab] = useState<"learn" | "wk" | "jlpt">(
    initialTab === "level" ? "wk" : initialTab === "jlpt" ? "jlpt" : "learn",
  );
  const [studyMode, setStudyMode] = useState(() => (typeof initialStudyMode === "boolean" ? initialStudyMode : true));
  const forcedTab = dashboardTab === "wk"
    ? "level"
    : dashboardTab === "jlpt"
      ? "jlpt"
      : "study";
  const effectiveActiveTab = forcedTab;
  const [showEnglish, setShowEnglish] = useState(false);
  const [activeCustomLibraryName, setActiveCustomLibraryName] = useState<string | null>(null);
  const [studySourceModalRequestId, setStudySourceModalRequestId] = useState(0);
  const [queueMode, setQueueMode] = useState<QueueType>(
    initialQueueMode === QUEUE_TYPES.review || initialQueueMode === QUEUE_TYPES.lesson
      ? initialQueueMode
      : QUEUE_TYPES.review,
  );
  const [includeTrouble, setIncludeTrouble] = useState<boolean>(true);
  const [queueTagFilter, setQueueTagFilter] = useState<StudyTagFilter>("all");
  const [initialViewerMode, setInitialViewerMode] = useState<"detail" | "flash" | null>(null);
  const {
    studySource,
    setStudySource,
    customLibraryId,
    setCustomLibraryId,
    studyCounts,
    applySourceFromSearchParams,
  } = useStudySourceState({ accountId, countsStorageKey, isHydrated });
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      if (urlMode === QUEUE_TYPES.review || urlMode === QUEUE_TYPES.lesson) {
        setQueueMode(urlMode);
      } else if (initialQueueMode !== QUEUE_TYPES.review && initialQueueMode !== QUEUE_TYPES.lesson) {
        setQueueMode(window.localStorage.getItem(`wr:study-queue-mode:${accountId}`) === QUEUE_TYPES.lesson
          ? QUEUE_TYPES.lesson
          : QUEUE_TYPES.review);
      }

      const urlStudyMode = params.get("studyMode");
      if (urlStudyMode === "on" || urlStudyMode === "1") {
        setStudyMode(true);
      } else if (urlStudyMode === "off" || urlStudyMode === "0") {
        setStudyMode(false);
      } else if (typeof initialStudyMode !== "boolean") {
        const storedStudyMode = window.localStorage.getItem("wr:study-mode");
        if (storedStudyMode !== null) {
          setStudyMode(storedStudyMode === "1");
        }
      }

      setShowEnglish(window.localStorage.getItem(showEnglishStorageKey) === "1");
      setIncludeTrouble(window.localStorage.getItem(troubleMixStorageKey) !== "0");
      const storedLibraryName = window.localStorage.getItem(customLibraryNameStorageKey)?.trim();
      setActiveCustomLibraryName(storedLibraryName ? storedLibraryName : null);
      applySourceFromSearchParams(params);

      const viewer = params.get("viewer");
      setInitialViewerMode(viewer === "detail" || viewer === "flash" ? viewer : null);
      setQueueTagFilter(resolveStudyTagFilter(params, window.localStorage.getItem(queueTagFilterStorageKey)));
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
    troubleMixStorageKey,
  ]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }
    try {
      window.localStorage.setItem("wr:study-mode", studyMode ? "1" : "0");
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [isHydrated, studyMode]);

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
    const studyModeInUrl = params.get("studyMode");
    const nextStudyMode = studyMode ? "on" : "off";
    if (studyModeInUrl !== nextStudyMode) {
      params.set("studyMode", nextStudyMode);
      changed = true;
    }
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
  }, [effectiveActiveTab, isHydrated, queueMode, queueTagFilter, queueTagFilterStorageKey, studyMode]);

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
      const urlStudyMode = params.get("studyMode");
      if (urlStudyMode === "on" || urlStudyMode === "1") {
        setStudyMode(true);
      } else if (urlStudyMode === "off" || urlStudyMode === "0") {
        setStudyMode(false);
      }
      setQueueTagFilter(parseStudyTagFilter(params.get("tag")) ?? "all");

      applySourceFromSearchParams(params);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [applySourceFromSearchParams, isHydrated]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const query = (params.get("findLevel") ?? params.get("findJlpt") ?? params.get("findStudy") ?? "").trim();
    if (!query) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("wr:explorer-search", {
        detail: { query, scope: effectiveActiveTab },
      }),
    );
  }, [effectiveActiveTab, isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onDashboardTabChange = (event: Event) => {
      const custom = event as CustomEvent<{ tab?: string }>;
      const next = custom.detail?.tab;
      setDashboardTab(next === "wk" || next === "jlpt" ? next : "learn");
    };
    window.addEventListener("wr:dashboard-tab-change", onDashboardTabChange as EventListener);
    return () => {
      window.removeEventListener("wr:dashboard-tab-change", onDashboardTabChange as EventListener);
    };
  }, []);

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
  const levelExplorerTitle = studySource === "custom"
    ? `Library Explorer - ${studySourceHeaderLabel}`
    : "Library Explorer - WaniKani";
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

  return (
    <section className="space-y-3">
      <StudySourceControls
        accountId={accountId}
        viewedWkUsername={viewedWkUsername}
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
                studyCounts={studyCounts}
                onSetQueueMode={setQueueMode}
                onSetQueueTagFilter={setQueueTagFilter}
                onSetIncludeTrouble={setIncludeTrouble}
              />
            ) : null}
            <button
              type="button"
              onClick={() => setStudyMode((prev) => !prev)}
              className={`inline-flex h-9 min-w-0 flex-[1_1_0%] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition sm:h-10 sm:px-4 sm:text-xs sm:tracking-widest md:flex-none ${
                studyMode
                  ? "border-hot bg-hot text-white"
                  : "border-line bg-surface text-foreground hover:bg-surface-muted"
              }`}
            >
              <span className="sm:hidden">Study {studyMode ? "On" : "Off"}</span>
              <span className="hidden sm:inline">Study Mode {studyMode ? "On" : "Off"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className={effectiveActiveTab === "study" ? "block" : "hidden"}>
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
          queueMode={queueMode}
          includeTrouble={includeTrouble}
          queueTagFilter={queueTagFilter}
        />
      </div>

      <div className={effectiveActiveTab === "level" ? "block" : "hidden"}>
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
      </div>

      <div className={effectiveActiveTab === "jlpt" ? "block" : "hidden"}>
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
      </div>
    </section>
  );
}
