"use client";
import { useEffect, useRef, useState } from "react";
import JlptExplorer from "./jlpt-explorer/components/JlptExplorer";
import LevelExplorer from "./level-explorer/components/LevelExplorer";
import FilterChipLabel from "./shared/FilterChipLabel";
import StudyExplorer from "./study-explorer/components/StudyExplorer";
import StudySourceControls from "./StudySourceControls";
import { useStudySourceState } from "./useStudySourceState";
import type { JlptItem, Snapshot, SrsFilter, UserKanjiItem } from "./explorerTypes";
import type { StudySrsFilter, StudySrsStageFilter, StudyTypeFilter } from "./study-explorer/lib/studyExplorerTypes";
import { QUEUE_TYPES, type QueueType } from "@/lib/domainConstants";
const CUSTOM_STUDY_MAX_LEVEL = 4;

type Props = {
  accountId: string;
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
  maxLevel,
  accountPendingReviews,
  levelItemCountsByLevel,
  initialQueueMode = null,
  initialStudyMode = null,
  initialSnapshot,
  initialSrsFilter,
  jlptItems,
  userKanjiItems,
  initialStudyFilters,
  initialTab = "study",
}: Props) {
  const previousPageKeyRef = useRef<string | null>(null);
  const countsStorageKey = `wr:study-queue-counts:${accountId}`;
  const showEnglishStorageKey = `wr:explorer-show-english:${accountId}`;
  const isHydrated = typeof window !== "undefined";
  const [dashboardTab, setDashboardTab] = useState<string>("learn");
  const [studyMode, setStudyMode] = useState(() => (typeof initialStudyMode === "boolean" ? initialStudyMode : true));
  const [activeTab, setActiveTab] = useState<"study" | "level" | "jlpt">(initialTab);
  const [showEnglish, setShowEnglish] = useState(false);
  const [activeCustomLibraryName, setActiveCustomLibraryName] = useState<string | null>(null);
  const [studySourceModalRequestId, setStudySourceModalRequestId] = useState(0);
  const [queueMode, setQueueMode] = useState<QueueType>(
    initialQueueMode === QUEUE_TYPES.review || initialQueueMode === QUEUE_TYPES.lesson
      ? initialQueueMode
      : QUEUE_TYPES.review,
  );
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
      const urlTab = params.get("tab") === "jlpt" ? "jlpt" : params.get("tab") === "level" ? "level" : "study";
      setActiveTab(urlTab);

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
      applySourceFromSearchParams(params);

      const viewer = params.get("viewer");
      setInitialViewerMode(viewer === "detail" || viewer === "flash" ? viewer : null);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    accountId,
    applySourceFromSearchParams,
    initialQueueMode,
    initialStudyMode,
    showEnglishStorageKey,
  ]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem("wr:study-mode", studyMode ? "1" : "0");
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [isHydrated, studyMode]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(`wr:study-queue-mode:${accountId}`, queueMode);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [accountId, isHydrated, queueMode]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("tab");
    const tabInUrl = raw === "jlpt" ? "jlpt" : raw === "level" ? "level" : "study";
    let changed = false;
    if (tabInUrl !== activeTab) {
      params.set("tab", activeTab);
      changed = true;
    }
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
    if (changed) {
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, "", next);
    }
  }, [activeTab, isHydrated, queueMode, studyMode]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }
    const pageKey = activeTab === "study" ? `${activeTab}:${queueMode}` : activeTab;
    if (previousPageKeyRef.current === null) {
      previousPageKeyRef.current = pageKey;
      return;
    }

    if (previousPageKeyRef.current !== pageKey) {
      window.dispatchEvent(
        new CustomEvent("wr:explorer-page-change", {
          detail: { activeTab, queueMode },
        }),
      );
      previousPageKeyRef.current = pageKey;
    }
  }, [activeTab, isHydrated, queueMode]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
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
      setActiveTab(params.get("tab") === "jlpt" ? "jlpt" : params.get("tab") === "level" ? "level" : "study");
      const urlMode = params.get("mode");
      if (urlMode === QUEUE_TYPES.review || urlMode === QUEUE_TYPES.lesson) setQueueMode(urlMode);
      const urlStudyMode = params.get("studyMode");
      if (urlStudyMode === "on" || urlStudyMode === "1") {
        setStudyMode(true);
      } else if (urlStudyMode === "off" || urlStudyMode === "0") {
        setStudyMode(false);
      }

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
        detail: { query, scope: activeTab },
      }),
    );
  }, [activeTab, isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onDashboardTabChange = (event: Event) => {
      const custom = event as CustomEvent<{ tab?: string }>;
      setDashboardTab(custom.detail?.tab ?? "learn");
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
  const openStudySourceManager = () => {
    setStudySourceModalRequestId((current) => current + 1);
  };
  if (dashboardTab !== "learn") return null;
  function tabClass(tab: "study" | "level" | "jlpt"): string {
    const active = activeTab === tab;
    return active
      ? "inline-flex h-7 flex-1 items-center justify-center rounded-full border border-accent bg-accent px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white sm:h-8 sm:flex-none sm:px-4 sm:text-xs sm:tracking-[0.1em]"
      : "inline-flex h-7 flex-1 items-center justify-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground hover:bg-surface-muted sm:h-8 sm:flex-none sm:px-4 sm:text-xs sm:tracking-[0.1em]";
  }

  function queueModeSegmentClass(mode: QueueType, activeMode: QueueType): string {
    const active = mode === activeMode;
    if (!active) {
      return "inline-flex h-7 flex-1 items-center justify-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground hover:bg-surface-muted sm:h-8 sm:px-4 sm:text-xs sm:tracking-[0.1em]";
    }

    return mode === QUEUE_TYPES.review
      ? "inline-flex h-7 flex-1 items-center justify-center rounded-full border border-amber-500 bg-amber-500 px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white sm:h-8 sm:px-4 sm:text-xs sm:tracking-[0.1em]"
      : "inline-flex h-7 flex-1 items-center justify-center rounded-full border border-sky-500 bg-sky-500 px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white sm:h-8 sm:px-4 sm:text-xs sm:tracking-[0.1em]";
  }

  function reviewCountLabel(): string {
    if (typeof studyCounts?.reviews !== "number") {
      return "...";
    }
    const total = typeof studyCounts.reviewsTotal === "number"
      ? studyCounts.reviewsTotal
      : studyCounts.reviews;
    return `${studyCounts.reviews}/${total}`;
  }

  return (
    <section className="space-y-3">
      <StudySourceControls
        accountId={accountId}
        studySource={studySource}
        onSetStudySource={setStudySource}
        customLibraryId={customLibraryId}
        onSetCustomLibraryId={setCustomLibraryId}
        onActiveLibraryNameChange={setActiveCustomLibraryName}
        openRequestId={studySourceModalRequestId}
      />
      <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <div
          className="inline-flex w-full flex-nowrap items-center gap-0 rounded-full border border-line bg-surface p-1"
          role="tablist"
          aria-label="Explorer tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "study"}
            className={tabClass("study")}
            onClick={() => setActiveTab("study")}
          >
            Study
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "level"}
            className={tabClass("level")}
            onClick={() => setActiveTab("level")}
          >
            <span className="sm:hidden">WK Explorer</span>
            <span className="hidden sm:inline">WK Explorer</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "jlpt"}
            className={tabClass("jlpt")}
            onClick={() => setActiveTab("jlpt")}
          >
            JLPT Explorer
          </button>
        </div>
        <div className="w-full overflow-x-auto md:overflow-visible">
          <div className="flex min-w-max items-center gap-2 pr-1 md:ml-auto md:min-w-0 md:justify-end">
            {activeTab === "study" ? (
              <div
                className="inline-flex shrink-0 items-center rounded-full border border-line bg-surface p-1"
                role="tablist"
                aria-label="Study queue mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={queueMode === QUEUE_TYPES.review}
                  onClick={() => setQueueMode(QUEUE_TYPES.review)}
                  className={queueModeSegmentClass(QUEUE_TYPES.review, queueMode)}
                >
                  <FilterChipLabel label="Reviews" count={reviewCountLabel()} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={queueMode === QUEUE_TYPES.lesson}
                  onClick={() => setQueueMode(QUEUE_TYPES.lesson)}
                  className={queueModeSegmentClass(QUEUE_TYPES.lesson, queueMode)}
                >
                  <FilterChipLabel label="Lessons" count={typeof studyCounts?.lessons === "number" ? studyCounts.lessons : "..."} />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setStudyMode((prev) => !prev)}
              className={`inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition sm:h-10 sm:px-4 sm:text-xs sm:tracking-widest ${
                studyMode
                  ? "border-hot bg-hot text-white"
                  : "border-line bg-surface text-foreground hover:bg-surface-muted"
              }`}
            >
              <span className="sm:hidden">Mode {studyMode ? "On" : "Off"}</span>
              <span className="hidden sm:inline">Study Mode {studyMode ? "On" : "Off"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className={activeTab === "study" ? "block" : "hidden"}>
        <StudyExplorer
          accountId={accountId}
          studySource={studySource}
          customLibraryId={customLibraryId}
          studySourceHeaderLabel={studySourceHeaderLabel}
          studySourceIsCustom={studySourceIsCustom}
          onOpenStudySourceManager={openStudySourceManager}
          maxLevel={studySource === "custom" ? CUSTOM_STUDY_MAX_LEVEL : maxLevel}
          initialViewerMode={initialViewerMode}
          initialFilters={initialStudyFilters}
          showEnglish={showEnglish}
          onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
          canToggleEnglish={!studyMode}
          studyMode={studyMode}
          queueMode={queueMode}
        />
      </div>

      <div className={activeTab === "level" ? "block" : "hidden"}>
        <LevelExplorer
          accountId={accountId}
          isActive={activeTab === "level"}
          maxLevel={maxLevel}
          accountPendingReviews={accountPendingReviews}
          levelItemCountsByLevel={levelItemCountsByLevel}
          initialSnapshot={initialSnapshot}
          initialSrsFilter={initialSrsFilter}
          showEnglish={showEnglish}
          canToggleEnglish={!studyMode}
          onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
          studyMode={studyMode}
        />
      </div>

      <div className={activeTab === "jlpt" ? "block" : "hidden"}>
        <JlptExplorer
          accountId={accountId}
          isActive={activeTab === "jlpt"}
          items={jlptItems}
          showEnglish={showEnglish}
          canToggleEnglish={!studyMode}
          onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
          studyMode={studyMode}
          userKanjiItems={userKanjiItems}
        />
      </div>
    </section>
  );
}
