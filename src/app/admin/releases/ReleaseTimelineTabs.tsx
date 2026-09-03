"use client";

import { useState } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";
import type { FeatureTimelineEntry } from "@/lib/featureTimeline";
import type { Ticket } from "@/lib/tickets";

import {
  RELEASE_TAB_COOKIE_KEY,
  RELEASE_TABS,
  RELEASE_TIMELINE_COPY,
  type ReleaseTab,
} from "./ReleaseTimeline.constants";
import ReleaseTimelineList from "./ReleaseTimelineList";
import TicketBoard from "./TicketBoard";

type Props = {
  inProgress: FeatureTimelineEntry[];
  planned: FeatureTimelineEntry[];
  shipped: FeatureTimelineEntry[];
  backlog: FeatureTimelineEntry[];
  cancelled: FeatureTimelineEntry[];
  wishes: Ticket[];
  /** Read from the cookie by the server, so the first paint is already right. */
  initialTab: ReleaseTab;
};

/**
 * One list at a time. The choice is kept in a cookie rather than localStorage
 * so the server renders the remembered tab directly - reading storage after
 * hydration flashed the default tab on every reload.
 *
 * Six tabs is more than the segmented control was built for, so the container
 * wraps instead of overflowing off a phone screen.
 */
export default function ReleaseTimelineTabs({
  inProgress,
  planned,
  shipped,
  backlog,
  cancelled,
  wishes,
  initialTab,
}: Props) {
  const [tab, setTab] = useState<ReleaseTab>(initialTab);

  const changeTab = (next: ReleaseTab) => {
    setTab(next);
    document.cookie = `${RELEASE_TAB_COOKIE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 180}`;
  };

  const legend: Record<ReleaseTab, string> = {
    [RELEASE_TABS.inProgress]: RELEASE_TIMELINE_COPY.inProgressLegend,
    [RELEASE_TABS.planned]: RELEASE_TIMELINE_COPY.estimateLegend,
    [RELEASE_TABS.released]: RELEASE_TIMELINE_COPY.historyNote,
    [RELEASE_TABS.backlog]: RELEASE_TIMELINE_COPY.backlogLegend,
    [RELEASE_TABS.cancelled]: RELEASE_TIMELINE_COPY.cancelledLegend,
    [RELEASE_TABS.wishes]: RELEASE_TIMELINE_COPY.wishLegend,
  };

  return (
    <section className="mt-8">
      <SegmentedControl<ReleaseTab>
        ariaLabel="Release timeline tabs"
        asTabs
        size="md"
        value={tab}
        onChange={changeTab}
        className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface p-1"
        options={[
          {
            value: RELEASE_TABS.inProgress,
            label: `${RELEASE_TIMELINE_COPY.inProgressHeading} · ${inProgress.length}`,
          },
          {
            value: RELEASE_TABS.planned,
            label: `${RELEASE_TIMELINE_COPY.plannedHeading} · ${planned.length}`,
          },
          {
            value: RELEASE_TABS.released,
            label: `${RELEASE_TIMELINE_COPY.shippedHeading} · ${shipped.length}`,
          },
          {
            value: RELEASE_TABS.backlog,
            label: `${RELEASE_TIMELINE_COPY.backlogHeading} · ${backlog.length}`,
          },
          {
            value: RELEASE_TABS.cancelled,
            label: `${RELEASE_TIMELINE_COPY.cancelledHeading} · ${cancelled.length}`,
          },
          {
            value: RELEASE_TABS.wishes,
            label: `${RELEASE_TIMELINE_COPY.wishHeading} · ${wishes.length}`,
          },
        ]}
      />

      <p className="mb-4 mt-3 text-xs text-foreground/60">{legend[tab]}</p>

      {tab === RELEASE_TABS.wishes ? <TicketBoard initialWishes={wishes} /> : null}

      {tab === RELEASE_TABS.inProgress ? (
        <ReleaseTimelineList
          entries={inProgress}
          showEstimateFlag
          emptyMessage={RELEASE_TIMELINE_COPY.emptyInProgress}
          queue={{
            heading: RELEASE_TIMELINE_COPY.inProgressHeading,
            noun: RELEASE_TIMELINE_COPY.queueNounClaimed,
          }}
        />
      ) : null}

      {tab === RELEASE_TABS.planned ? (
        <ReleaseTimelineList
          entries={planned}
          showEstimateFlag
          queue={{
            heading: RELEASE_TIMELINE_COPY.queueHeading,
            noun: RELEASE_TIMELINE_COPY.queueNounPlanned,
          }}
        />
      ) : null}

      {tab === RELEASE_TABS.released ? <ReleaseTimelineList entries={shipped} /> : null}

      {tab === RELEASE_TABS.backlog ? (
        <ReleaseTimelineList
          entries={backlog}
          showStatusFlag
          emptyMessage={RELEASE_TIMELINE_COPY.emptyBacklog}
          queue={{
            heading: RELEASE_TIMELINE_COPY.backlogHeading,
            noun: RELEASE_TIMELINE_COPY.queueNounParked,
          }}
        />
      ) : null}

      {tab === RELEASE_TABS.cancelled ? (
        <ReleaseTimelineList
          entries={cancelled}
          showStatusFlag
          emptyMessage={RELEASE_TIMELINE_COPY.emptyCancelled}
          queue={{
            heading: RELEASE_TIMELINE_COPY.cancelledHeading,
            noun: RELEASE_TIMELINE_COPY.queueNounCancelled,
          }}
        />
      ) : null}
    </section>
  );
}
