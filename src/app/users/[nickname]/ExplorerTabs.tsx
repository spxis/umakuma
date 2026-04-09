"use client";

import { useEffect, useState } from "react";

import ExplorerSearchBar from "./ExplorerSearchBar";
import JlptExplorer from "./jlpt-explorer/components/JlptExplorer";
import LevelExplorer from "./level-explorer/components/LevelExplorer";
import type { JlptItem, Snapshot, SrsFilter, UserKanjiItem } from "./explorerTypes";

type Props = {
  accountId: string;
  maxLevel: number;
  initialSnapshot: Snapshot;
  initialSrsFilter: SrsFilter;
  jlptItems: JlptItem[];
  userKanjiItems: UserKanjiItem[];
};

export default function ExplorerTabs({
  accountId,
  maxLevel,
  initialSnapshot,
  initialSrsFilter,
  jlptItems,
  userKanjiItems,
}: Props) {
  const [activeTab, setActiveTab] = useState<"level" | "jlpt">(() => {
    if (typeof window === "undefined") {
      return "level";
    }

    const raw = new URLSearchParams(window.location.search).get("tab");
    return raw === "jlpt" ? "jlpt" : "level";
  });
  const [showEnglish, setShowEnglish] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tabInUrl = params.get("tab") === "jlpt" ? "jlpt" : "level";
    if (tabInUrl !== activeTab) {
      params.set("tab", activeTab);
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, "", next);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onPopState = () => {
      const raw = new URLSearchParams(window.location.search).get("tab");
      setActiveTab(raw === "jlpt" ? "jlpt" : "level");
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const query = (params.get("findLevel") ?? params.get("findJlpt") ?? "").trim();
    if (!query) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("wr:explorer-search", {
        detail: { query, scope: activeTab },
      }),
    );
  }, [activeTab]);

  function tabClass(tab: "level" | "jlpt"): string {
    const active = activeTab === tab;
    return active
      ? "rounded-full border border-accent bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white"
      : "rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted";
  }

  return (
    <section className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Explorer tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "level"}
            className={tabClass("level")}
            onClick={() => setActiveTab("level")}
          >
            WaniKani Explorer
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
        <div className="flex items-center gap-2">
          <ExplorerSearchBar scope={activeTab} />
          <button
            type="button"
            onClick={() => setShowEnglish((prev) => !prev)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.1em] text-foreground transition hover:bg-surface-muted"
          >
            {showEnglish ? "Hide English" : "Show English"}
          </button>
        </div>
      </div>

      <div className={activeTab === "level" ? "block" : "hidden"}>
        <LevelExplorer
          accountId={accountId}
          maxLevel={maxLevel}
          initialSnapshot={initialSnapshot}
          initialSrsFilter={initialSrsFilter}
          showEnglish={showEnglish}
        />
      </div>

      <div className={activeTab === "jlpt" ? "block" : "hidden"}>
        <JlptExplorer
          items={jlptItems}
          showEnglish={showEnglish}
          userKanjiItems={userKanjiItems}
        />
      </div>
    </section>
  );
}
