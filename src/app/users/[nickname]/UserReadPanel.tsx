"use client";

import Image from "next/image";
import { useMemo } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";
import NewsReader from "@/app/news/NewsReader";
import NewsHistoryViewerClient from "@/app/news/history/NewsHistoryViewerClient";
import NewsStatsClient from "@/app/news/stats/NewsStatsClient";
import umaKumaLeft from "@/images/umakuma-1.png";
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
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="overflow-hidden rounded-xl border border-line/70 bg-surface">
            <Image src={umaKumaLeft} alt="Uma and Kuma" width={96} height={60} className="h-13 w-24 object-contain p-1.5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">News</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
              Read news without leaving this user page.
            </p>
          </div>
        </div>
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
