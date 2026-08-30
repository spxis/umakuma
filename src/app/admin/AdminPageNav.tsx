import Link from "next/link";

import {
  ADMIN_WORKSPACE_ROUTES,
  ADMIN_WORKSPACE_TABS,
  ADMIN_WORKSPACE_TAB_LABELS,
  type AdminWorkspaceTab,
} from "./AdminWorkspaceTabs";

type Props = {
  activeTab: AdminWorkspaceTab;
};

/**
 * The admin tab row for pages that render on their own instead of inside
 * `AdminWorkspacePage`. Without it those pages are reachable from the workspace
 * but have no way back, which is how both of them shipped unlinked.
 */
export default function AdminPageNav({ activeTab }: Props) {
  return (
    <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-1.5">
      {ADMIN_WORKSPACE_TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <Link
            key={tab}
            href={ADMIN_WORKSPACE_ROUTES[tab]}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide transition ${
              isActive
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-foreground/60 hover:bg-surface-muted"
            }`}
          >
            {ADMIN_WORKSPACE_TAB_LABELS[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
