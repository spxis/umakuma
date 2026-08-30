"use client";

import { useRouter } from "next/navigation";

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
 */
export default function AdminPageNav({ activeTab }: Props) {
  const router = useRouter();

  return (
    <section className="w-full overflow-x-auto lg:flex lg:justify-end">
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
