"use client";

import Link from "next/link";
import { useCallback } from "react";

import {
  ADMIN_WORKSPACE_TABS,
  ADMIN_WORKSPACE_TAB_LABELS,
  type AdminWorkspaceTab,
  routeForAdminWorkspaceTab,
} from "./AdminWorkspaceTabs";

type Props = {
  activeTab: AdminWorkspaceTab;
};

/**
 * The admin tab row, shared by `AdminWorkspacePage` and the standalone admin
 * pages (releases, kanji coverage) so every admin route shows the same
 * navigation in the same slot. The standalone pages once rendered their own
 * pill nav, which is how they shipped looking like a different app.
 *
 * It sits inside the header's second row now, in the slot every other section
 * uses for its pages, and reads the same way they do - small caps on the left
 * rather than a centred segmented control floating in a third row of its own.
 * Admin was the last place still drawing its own navigation strip.
 *
 * They are links rather than buttons because they are routes; that restores
 * middle-click and open-in-new-tab, which the router.push control ate.
 *
 * Nine tabs do not fit a phone. Wrapping them costs three rows of height on
 * every admin screen, so the row scrolls instead - but it gave no sign of
 * that: the pill at the edge was sliced flat and read as a rendering fault
 * rather than as more content. The fade in `globals.css` marks the cut, and
 * lifts once there is nothing further to scroll to.
 */
export default function AdminPageNav({ activeTab }: Props) {
  const markScrollEnd = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    // A pixel of slack: fractional scroll positions never land exactly.
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
    element.dataset.scrollEnd = atEnd ? "true" : "false";
  }, []);

  return (
    <nav
      aria-label="Admin workspace tabs"
      ref={markScrollEnd}
      onScroll={(event) => markScrollEnd(event.currentTarget)}
      className="admin-tab-scroll flex min-w-0 items-center gap-x-2 gap-y-1 overflow-x-auto whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/45 sm:text-[11px]"
    >
      {ADMIN_WORKSPACE_TABS.map((tab) => (
        <Link
          key={tab}
          href={routeForAdminWorkspaceTab(tab)}
          aria-current={tab === activeTab ? "page" : undefined}
          className={`shrink-0 rounded-full px-2 py-0.5 transition ${
            tab === activeTab ? "bg-surface-muted font-black text-foreground" : "hover:text-foreground/75"
          }`}
        >
          {ADMIN_WORKSPACE_TAB_LABELS[tab]}
        </Link>
      ))}
    </nav>
  );
}
