"use client";

import { useMemo } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";
import NewsReader from "@/app/news/NewsReader";
import NewsHistoryViewerClient from "@/app/news/history/NewsHistoryViewerClient";
import NewsStatsClient from "@/app/news/stats/NewsStatsClient";
import { usePersistedTab } from "@/lib/usePersistedTab";

type ReadPanelTab = "news" | "history" | "stats";

type UserReadPanelProps = {
  userWkLevel: number | null;
  devSampleUrls?: string[];
  initialTab?: ReadPanelTab;
};

export default function UserReadPanel({
  userWkLevel,
  devSampleUrls = [],
  initialTab = "news",
}: UserReadPanelProps) {
  const tabOptions = useMemo(() => ["news", "history", "stats"] as const, []);
  const [activeTab, setActiveTab] = usePersistedTab<ReadPanelTab>(
    "wr:user:read-panel-tab",
    tabOptions,
    initialTab,
  );

  return (
    <section className="space-y-3">
      <div className="flex justify-end sm:pr-1">
        <SegmentedControl
          ariaLabel="Read panel tabs"
          value={activeTab}
          onChange={(value) => setActiveTab(value as ReadPanelTab)}
          size="sm"
          options={[
            { value: "news", label: "Reader" },
            { value: "history", label: "History" },
            { value: "stats", label: "Stats" },
          ]}
        />
      </div>

      <section className="rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
        <h2 className="text-xl font-black text-foreground">News</h2>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
          Read news without leaving this user page.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
        {activeTab === "news" ? (
          <NewsReader devSampleUrls={devSampleUrls} userWkLevel={userWkLevel} />
        ) : null}
        {activeTab === "history" ? <NewsHistoryViewerClient /> : null}
        {activeTab === "stats" ? <NewsStatsClient /> : null}
      </section>
    </section>
  );
}
