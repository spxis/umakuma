"use client";

import { useState } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";
import type { FeatureTimelineEntry } from "@/lib/featureTimeline";
import type { Ticket } from "@/lib/tickets";

import { RELEASE_TAB_COOKIE_KEY, RELEASE_TABS, RELEASE_TIMELINE_COPY, type ReleaseTab } from "./ReleaseTimeline.constants";
import ReleaseTimelineList from "./ReleaseTimelineList";
import TicketBoard from "./TicketBoard";
import { isUnfinished } from "./ticketBoardView";

type Props = {
  shipped: FeatureTimelineEntry[];
  tickets: Ticket[];
  /** Read from the cookie by the server, so the first paint is already right. */
  initialTab: ReleaseTab;
};

/**
 * Two lists, one at a time: what is asked for, and what has shipped.
 *
 * There were six tabs. Four of them - In progress, Planned, Backlog,
 * Cancelled - read the timeline file, which has held shipped entries only
 * since the queue moved into the database, so they were permanently empty
 * and their counts read 0 beside a Tickets tab that held the real queue. The
 * choice is a cookie rather than localStorage so the server renders the
 * remembered tab directly.
 */
export default function ReleaseTimelineTabs({ shipped, tickets, initialTab }: Props) {
  const [tab, setTab] = useState<ReleaseTab>(initialTab);

  const changeTab = (next: ReleaseTab) => {
    setTab(next);
    document.cookie = `${RELEASE_TAB_COOKIE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 180}`;
  };

  /* The count is what is left to do, not every row the board has ever held:
     a queue that counts its own history says the same number forever. */
  const remaining = tickets.filter((ticket) => isUnfinished(ticket));

  const legend: Record<ReleaseTab, string> = {
    [RELEASE_TABS.tickets]: RELEASE_TIMELINE_COPY.ticketsLegend,
    [RELEASE_TABS.released]: RELEASE_TIMELINE_COPY.historyNote,
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
          { value: RELEASE_TABS.tickets, label: `${RELEASE_TIMELINE_COPY.ticketsHeading} · ${remaining.length}` },
          { value: RELEASE_TABS.released, label: `${RELEASE_TIMELINE_COPY.shippedHeading} · ${shipped.length}` },
        ]}
      />

      <p className="mb-4 mt-3 text-xs text-foreground/60">{legend[tab]}</p>

      {tab === RELEASE_TABS.tickets ? <TicketBoard initialTickets={tickets} /> : null}
      {tab === RELEASE_TABS.released ? <ReleaseTimelineList entries={shipped} /> : null}
    </section>
  );
}
