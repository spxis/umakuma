"use client";

import { useState } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";
import NewsReader from "@/app/news/NewsReader";
import NewsHistoryViewerClient from "@/app/news/history/NewsHistoryViewerClient";
import NewsStatsClient from "@/app/news/stats/NewsStatsClient";

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
  const [activeTab, setActiveTab] = useState<ReadPanelTab>(initialTab);

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface-muted p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground">News</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
            Read news without leaving this user page.
          </p>
        </div>
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

      {activeTab === "news" ? (
        <NewsReader devSampleUrls={devSampleUrls} userWkLevel={userWkLevel} />
      ) : null}
      {activeTab === "history" ? <NewsHistoryViewerClient /> : null}
      {activeTab === "stats" ? <NewsStatsClient /> : null}
    </section>
  );
}
