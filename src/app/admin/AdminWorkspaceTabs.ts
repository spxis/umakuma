export const ADMIN_WORKSPACE_TABS = ["operations", "campaigns", "history"] as const;

export type AdminWorkspaceTab = (typeof ADMIN_WORKSPACE_TABS)[number];

export const ADMIN_WORKSPACE_STORAGE_KEY = "admin-workspace:last-tab";

export const ADMIN_WORKSPACE_ROUTES: Record<AdminWorkspaceTab, string> = {
  operations: "/admin/account-operations",
  campaigns: "/admin/campaign-workspace",
  history: "/admin/submission-history",
};

export function routeForAdminWorkspaceTab(tab: AdminWorkspaceTab): string {
  return ADMIN_WORKSPACE_ROUTES[tab];
}
