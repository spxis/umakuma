"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import umaKumaLeft from "@/images/umakuma-1.png";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

import {
  ItemSpreadTabPanel,
  LevelProgressTabPanel,
  MainTabPanel,
} from "./UserDashboardTabPanels";
import type { TabId, UserDashboardTabsProps as Props } from "./UserDashboardTabs.types";

function isDashboardTabId(value: string | null): value is TabId {
  return value === "learn" || value === "wk" || value === "jlpt" || value === "stats" || value === "news" || value === "read";
}

function dashboardPathSegmentForTab(tab: TabId): string {
  return tab === "learn" ? "study" : tab === "wk" ? "library-explorer" : tab === "jlpt" ? "jlpt-explorer" : tab;
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
  if (segment === "study") {
    return "learn";
  }
  if (segment === "wk-explorer" || segment === "library-explorer") {
    return "wk";
  }
  if (segment === "jlpt-explorer") {
    return "jlpt";
  }
  return isDashboardTabId(segment) ? segment : null;
}

export default function UserDashboardTabs({
  accountId,
  wkUsername,
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

  useEffect(() => {
    if (initialDashboardTab !== "learn") {
      return;
    }

    const persistedTab = getStoredEnum(
      tabStorageKey,
      ["learn", "wk", "jlpt", "stats", "news", "read"] as const,
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
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("dashboard");

    const nextQuery = params.toString();
    const nextPath = `/users/${encodeURIComponent(wkUsername)}/${dashboardPathSegmentForTab(activeTab)}`;
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

  return (
    <>
      {activeTab === "learn" || activeTab === "wk" || activeTab === "jlpt" ? (
        <section role="tabpanel">
          {learnContent}
        </section>
      ) : null}

      {activeTab === "stats" ? (
        <section className="mt-4 space-y-4" role="tabpanel">
          <section className="rounded-2xl border border-line bg-surface/90 px-5 py-4 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
            <h2 className="flex items-center gap-3 text-xl font-black text-foreground sm:gap-4">
              <span className="overflow-hidden rounded-xl border border-line/70 bg-surface">
                <Image src={umaKumaLeft} alt="Uma and Kuma" width={96} height={60} className="h-13 w-24 object-contain p-1.5" />
              </span>
              <span>Stats</span>
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
              Progress snapshot and distribution at a glance.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface/90 p-3 sm:p-4">
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

          <section className="rounded-2xl border border-line bg-surface/90 p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/65">Item spread</p>
            <ItemSpreadTabPanel itemSpread={itemSpread} itemSpreadDetails={itemSpreadDetails} />
          </section>

          <section className="rounded-2xl border border-line bg-surface/90 p-3 sm:p-4">
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
