"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

import UserHeaderMenu from "./UserHeaderMenu";
import {
  ItemSpreadTabPanel,
  LevelProgressTabPanel,
  MainTabPanel,
} from "./UserDashboardTabPanels";
import type { LiveData, TabId, UserDashboardTabsProps as Props } from "./UserDashboardTabs.types";

function isDashboardTabId(value: string | null): value is TabId {
  return value === "learn" || value === "stats" || value === "news" || value === "read";
}

function resolveDashboardTabFromPathname(pathname: string, wkUsername: string): TabId | null {
  const userBasePath = `/users/${encodeURIComponent(wkUsername)}`;
  if (pathname === userBasePath) {
    return "learn";
  }
  if (!pathname.startsWith(`${userBasePath}/`)) {
    return null;
  }

  const segment = pathname.slice(userBasePath.length + 1).split("/")[0] ?? null;
  return isDashboardTabId(segment) ? segment : null;
}

export default function UserDashboardTabs({
  accountId,
  wkUsername,
  lastSyncedAt,
  lastActivityAt,
  wkLevel,
  levelKanjiLearned,
  levelKanjiTotal,
  levelKanjiLocked,
  totalLearnedKanji,
  estimatedHoursRemaining,
  apprenticeCount,
  guruCount,
  masterCount,
  enlightenedCount,
  burnedCount,
  radicalCount,
  totalKanjiCount,
  vocabularyCount,
  itemSpread,
  itemSpreadDetails,
  levelRadicalProgress,
  levelKanjiProgress,
  levelVocabularyProgress,
  remainingToLevelUp,
  passedLevelUpGate,
  availableProgressLevels = [],
  levelProgressByLevel = {},
  viewerMenuInfo,
  canViewAllUserPages,
  initialDashboardTab,
  learnContent,
  newsContent,
  readContent,
}: Props) {
  const tabStorageKey = `wr:user:${accountId}:dashboard-tab-v2`;
  const levelProgressStorageKey = `wr:user:${accountId}:level-progress-level`;

  const safeProgressLevels = useMemo(
    () =>
      Array.from(
        new Set([
          ...Array.from({ length: Math.max(1, wkLevel) }, (_, index) => index + 1),
          ...(Array.isArray(availableProgressLevels) ? availableProgressLevels : []),
        ]),
      ).sort((a, b) => a - b),
    [availableProgressLevels, wkLevel],
  );

  const [activeTab, setActiveTab] = useState<TabId>(initialDashboardTab);
  const [selectedProgressLevel, setSelectedProgressLevel] = useState<number>(() => {
    if (typeof window === "undefined") {
      return wkLevel;
    }
    const raw = window.localStorage.getItem(levelProgressStorageKey);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : wkLevel;
  });
  const [flashViewerOpen, setFlashViewerOpen] = useState(false);

  const { data: liveData, mutate } = useSWR<LiveData>(
    `/api/accounts/${accountId}/live`,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as LiveData;
      if (!response.ok) {
        throw new Error("Could not fetch live account data.");
      }
      return payload;
    },
    { refreshInterval: 15_000, revalidateOnFocus: true },
  );

  useEffect(() => {
    if (initialDashboardTab !== "learn") {
      return;
    }

    const persistedTab = getStoredEnum(
      tabStorageKey,
      ["learn", "stats", "news", "read"] as const,
      "learn",
    );

    if (persistedTab !== activeTab) {
      const restoreTimer = window.setTimeout(() => {
        setActiveTab(persistedTab);
      }, 0);

      return () => {
        window.clearTimeout(restoreTimer);
      };
    }
  }, [activeTab, initialDashboardTab, tabStorageKey]);

  useEffect(() => {
    const onUserRefreshed = (event: Event) => {
      const custom = event as CustomEvent<{ accountId?: string }>;
      if (custom.detail?.accountId !== accountId) {
        return;
      }
      void mutate();
    };

    window.addEventListener("wr:user-refreshed", onUserRefreshed as EventListener);
    return () => {
      window.removeEventListener("wr:user-refreshed", onUserRefreshed as EventListener);
    };
  }, [accountId, mutate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("dashboard");

    const nextQuery = params.toString();
    const nextPath = `/users/${encodeURIComponent(wkUsername)}/${activeTab}`;
    const nextUrl = `${nextPath}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState(null, "", nextUrl);
    }

    window.dispatchEvent(new CustomEvent("wr:dashboard-tab-change", { detail: { tab: activeTab } }));
  }, [activeTab, wkUsername]);

  useEffect(() => {
    const onDashboardTabRequest = (event: Event) => {
      const custom = event as CustomEvent<{ tab?: string }>;
      const next = custom.detail?.tab ?? null;
      if (!isDashboardTabId(next) || next === activeTab) {
        return;
      }

      setActiveTab(next);
      setStoredEnum(tabStorageKey, next);
    };

    window.addEventListener("wr:dashboard-tab-request", onDashboardTabRequest as EventListener);
    return () => {
      window.removeEventListener("wr:dashboard-tab-request", onDashboardTabRequest as EventListener);
    };
  }, [activeTab, tabStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncTabFromLocation = () => {
      const next = resolveDashboardTabFromPathname(window.location.pathname, wkUsername);
      if (!next || next === activeTab) {
        return;
      }

      setActiveTab(next);
      setStoredEnum(tabStorageKey, next);
    };

    syncTabFromLocation();
    window.addEventListener("popstate", syncTabFromLocation);
    return () => {
      window.removeEventListener("popstate", syncTabFromLocation);
    };
  }, [activeTab, tabStorageKey, wkUsername]);

  useEffect(() => {
    const onStudyViewerModeChange = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean; viewerMode?: "detail" | "flash" | null }>;
      setFlashViewerOpen(Boolean(custom.detail?.open) && custom.detail?.viewerMode === "flash");
    };

    window.addEventListener("wr:study-viewer-mode", onStudyViewerModeChange as EventListener);
    return () => {
      window.removeEventListener("wr:study-viewer-mode", onStudyViewerModeChange as EventListener);
    };
  }, []);

  const effectiveSelectedProgressLevel =
    safeProgressLevels.includes(selectedProgressLevel)
      ? selectedProgressLevel
      : safeProgressLevels.includes(wkLevel)
        ? wkLevel
        : safeProgressLevels[safeProgressLevels.length - 1] ?? wkLevel;

  useEffect(() => {
    if (!safeProgressLevels.includes(effectiveSelectedProgressLevel)) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(levelProgressStorageKey, String(effectiveSelectedProgressLevel));
  }, [effectiveSelectedProgressLevel, levelProgressStorageKey, safeProgressLevels]);

  const selectedLevelProgress = levelProgressByLevel?.[effectiveSelectedProgressLevel] ?? {
    radical: levelRadicalProgress,
    kanji: levelKanjiProgress,
    vocabulary: levelVocabularyProgress,
    remainingToLevelUp,
    passedLevelUpGate,
  };

  const showTopHeader = activeTab !== "learn";

  return (
    <>
      {showTopHeader ? (
        <section className="flex justify-end">
          <div className="ml-auto flex items-center gap-2">
            <UserHeaderMenu
              accountId={accountId}
              viewedWkUsername={wkUsername}
              viewerMenuInfo={viewerMenuInfo}
              showAdminActions={canViewAllUserPages}
              hidden={flashViewerOpen}
              lastSyncedAt={liveData?.lastSyncedAt ?? lastSyncedAt}
              lastActivityAt={liveData?.lastActivityAt ?? lastActivityAt}
            />
          </div>
        </section>
      ) : null}

      {activeTab === "learn" ? (
        <section role="tabpanel">
          {learnContent}
        </section>
      ) : null}

      {activeTab === "stats" ? (
        <section className="mt-4 space-y-4" role="tabpanel">
          <section className="rounded-4xl border border-line bg-surface/90 px-5 py-4 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
            <h2 className="text-xl font-black text-foreground">Stats</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
              Progress snapshot and distribution at a glance.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface-muted p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/65">Snapshot</p>
            <MainTabPanel
              wkLevel={wkLevel}
              levelKanjiLearned={levelKanjiLearned}
              levelKanjiTotal={levelKanjiTotal}
              levelKanjiLocked={levelKanjiLocked}
              totalLearnedKanji={totalLearnedKanji}
              estimatedHoursRemaining={estimatedHoursRemaining}
              apprenticeCount={apprenticeCount}
              guruCount={guruCount}
              masterCount={masterCount}
              enlightenedCount={enlightenedCount}
              burnedCount={burnedCount}
              radicalCount={radicalCount}
              totalKanjiCount={totalKanjiCount}
              vocabularyCount={vocabularyCount}
            />
          </section>

          <section className="rounded-2xl border border-line bg-surface-muted p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/65">Item spread</p>
            <ItemSpreadTabPanel itemSpread={itemSpread} itemSpreadDetails={itemSpreadDetails} />
          </section>

          <section className="rounded-2xl border border-line bg-surface-muted p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/65">Level progress</p>
            <LevelProgressTabPanel
              accountId={accountId}
              currentWkLevel={wkLevel}
              wkLevel={effectiveSelectedProgressLevel}
              levelOptions={safeProgressLevels}
              levelProgressByLevel={levelProgressByLevel}
              onSelectLevel={setSelectedProgressLevel}
              levelRadicalProgress={selectedLevelProgress.radical}
              levelKanjiProgress={selectedLevelProgress.kanji}
              levelVocabularyProgress={selectedLevelProgress.vocabulary}
              remainingToLevelUp={selectedLevelProgress.remainingToLevelUp}
              passedLevelUpGate={selectedLevelProgress.passedLevelUpGate}
            />
          </section>
        </section>
      ) : null}

      {activeTab === "news" ? (
        <section className="mt-4" role="tabpanel">
          {newsContent}
        </section>
      ) : null}

      {activeTab === "read" ? (
        <section className="mt-4" role="tabpanel">
          {readContent}
        </section>
      ) : null}
    </>
  );
}
