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
  /** Read from the cookie by the server, so the first paint is already right. */
  initialTab: ReleaseTab;
};

/**
 * One list at a time. The choice is kept in a cookie rather than localStorage
 * so the server renders the remembered tab directly - reading storage after
 * hydration flashed the default tab on every reload.
 */
export default function ReleaseTimelineTabs({ planned, shipped, initialTab }: Props) {
  const [tab, setTab] = useState<ReleaseTab>(initialTab);

  const changeTab = (next: ReleaseTab) => {
    setTab(next);
    document.cookie = `${RELEASE_TAB_COOKIE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 180}`;
  };

  const showPlanned = tab === RELEASE_TABS.planned;

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
        ]}
      />

      <p className="mb-4 mt-3 text-xs text-foreground/60">
        {showPlanned ? RELEASE_TIMELINE_COPY.estimateLegend : RELEASE_TIMELINE_COPY.historyNote}
      </p>

      {showPlanned ? (
        <ReleaseTimelineList entries={planned} showEstimateFlag />
      ) : (
        <ReleaseTimelineList entries={shipped} />
      )}
    </section>
  );
}
