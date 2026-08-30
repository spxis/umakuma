"use client";

import { useState } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";

import {
  RELEASE_TAB_COOKIE_KEY,
  RELEASE_TABS,
  RELEASE_TIMELINE_COPY,
  type ReleaseTab,
} from "./ReleaseTimeline.constants";
import ReleaseTimelineList from "./ReleaseTimelineList";
import type { FeatureTimelineEntry } from "@/lib/featureTimeline";

type Props = {
  planned: FeatureTimelineEntry[];
  shipped: FeatureTimelineEntry[];
  shelved: FeatureTimelineEntry[];
  /** Read from the cookie by the server, so the first paint is already right. */
  initialTab: ReleaseTab;
};

/**
 * One list at a time. The choice is kept in a cookie rather than localStorage
 * so the server renders the remembered tab directly - reading storage after
 * hydration flashed the default tab on every reload.
 */
export default function ReleaseTimelineTabs({ planned, shipped, shelved, initialTab }: Props) {
  const [tab, setTab] = useState<ReleaseTab>(initialTab);

  const changeTab = (next: ReleaseTab) => {
    setTab(next);
    document.cookie = `${RELEASE_TAB_COOKIE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 180}`;
  };

  return (
    <section className="mt-8">
      <SegmentedControl<ReleaseTab>
        ariaLabel="Release timeline tabs"
        asTabs
        size="md"
        value={tab}
        onChange={changeTab}
        options={[
          {
            value: RELEASE_TABS.planned,
            label: `${RELEASE_TIMELINE_COPY.plannedHeading} · ${planned.length}`,
          },
          {
            value: RELEASE_TABS.released,
            label: `${RELEASE_TIMELINE_COPY.shippedHeading} · ${shipped.length}`,
          },
          {
            value: RELEASE_TABS.shelved,
            label: `${RELEASE_TIMELINE_COPY.shelvedHeading} · ${shelved.length}`,
          },
        ]}
      />

      <p className="mb-4 mt-3 text-xs text-foreground/60">
        {tab === RELEASE_TABS.planned
          ? RELEASE_TIMELINE_COPY.estimateLegend
          : tab === RELEASE_TABS.shelved
            ? RELEASE_TIMELINE_COPY.shelvedLegend
            : RELEASE_TIMELINE_COPY.historyNote}
      </p>

      {tab === RELEASE_TABS.planned ? (
        <ReleaseTimelineList entries={planned} showEstimateFlag />
      ) : tab === RELEASE_TABS.shelved ? (
        <ReleaseTimelineList entries={shelved} showStatusFlag />
      ) : (
        <ReleaseTimelineList entries={shipped} />
      )}
    </section>
  );
}
