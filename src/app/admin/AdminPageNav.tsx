"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import SegmentedControl from "../shared/SegmentedControl";
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
 * Nine tabs do not fit a phone. Wrapping them costs three rows of height on
 * every admin screen, so the row scrolls instead - but it gave no sign of
 * that: the pill at the edge was sliced flat and read as a rendering fault
 * rather than as more content. The fade in `globals.css` marks the cut, and
 * lifts once there is nothing further to scroll to.
 */
export default function AdminPageNav({ activeTab }: Props) {
  const router = useRouter();

  const markScrollEnd = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    // A pixel of slack: fractional scroll positions never land exactly.
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
    element.dataset.scrollEnd = atEnd ? "true" : "false";
  }, []);

  return (
    <section
      ref={markScrollEnd}
      onScroll={(event) => markScrollEnd(event.currentTarget)}
      className="admin-tab-scroll w-full overflow-x-auto lg:flex lg:justify-end"
    >
      <SegmentedControl<AdminWorkspaceTab>
        ariaLabel="Admin workspace tabs"
        asTabs
        size="sm"
        value={activeTab}
        onChange={(nextTab) => {
          router.push(routeForAdminWorkspaceTab(nextTab));
        }}
        options={ADMIN_WORKSPACE_TABS.map((tab) => ({
          value: tab,
          label: ADMIN_WORKSPACE_TAB_LABELS[tab],
        }))}
      />
    </section>
  );
}
