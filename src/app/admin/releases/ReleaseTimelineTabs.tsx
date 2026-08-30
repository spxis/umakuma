"use client";

import { useState } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import type { FeatureTimelineEntry } from "@/lib/featureTimeline";

import {
  RELEASE_TAB_STORAGE_KEY,
  RELEASE_TAB_VALUES,
  RELEASE_TABS,
  RELEASE_TIMELINE_COPY,
  type ReleaseTab,
} from "./ReleaseTimeline.constants";
import ReleaseTimelineList from "./ReleaseTimelineList";

type Props = {
  planned: FeatureTimelineEntry[];
  shipped: FeatureTimelineEntry[];
};

/**
 * One list at a time. Planned is the default tab because the page's job is
 * deciding what happens next; the shipped history is the reference half.
 * The choice sticks per browser, like every other view-mode toggle.
 */
export default function ReleaseTimelineTabs({ planned, shipped }: Props) {
  const [tab, setTab] = useState<ReleaseTab>(() =>
    getStoredEnum(RELEASE_TAB_STORAGE_KEY, RELEASE_TAB_VALUES, RELEASE_TABS.planned));

  const changeTab = (next: ReleaseTab) => {
    setTab(next);
    setStoredEnum(RELEASE_TAB_STORAGE_KEY, next);
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
