export const ADMIN_WORKSPACE_TABS = ["data", "campaigns", "history", "users", "readingEntries", "releases", "kanjiCoverage", "featureFlags"] as const;

export type AdminWorkspaceTab = (typeof ADMIN_WORKSPACE_TABS)[number];

export const ADMIN_WORKSPACE_COOKIE_KEY = "admin-workspace-last-tab";
export const ADMIN_WORKSPACE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const ADMIN_WORKSPACE_ROUTES: Record<AdminWorkspaceTab, string> = {
  data: "/admin/data",
  campaigns: "/admin/campaign-workspace",
  history: "/admin/submission-history",
  users: "/admin/users",
  readingEntries: "/admin/reading-entries",
  releases: "/admin/releases",
  kanjiCoverage: "/admin/kanji-coverage",
  featureFlags: "/admin/feature-flags",
};

/** Tabs that navigate to their own page instead of rendering inside the workspace. */
export const ADMIN_STANDALONE_TABS = ["releases", "kanjiCoverage", "featureFlags"] as const;

export const ADMIN_WORKSPACE_TAB_LABELS: Record<AdminWorkspaceTab, string> = {
  data: "Data",
  campaigns: "Campaigns",
  history: "History",
  users: "Users",
  readingEntries: "Check-ins",
  releases: "Releases",
  kanjiCoverage: "Kanji",
  featureFlags: "Flags",
};

export function parseAdminWorkspaceTab(value: string | undefined, fallback: AdminWorkspaceTab = "users"): AdminWorkspaceTab {
  if (value === "jlpt" || value === "catalog") {
    return "data";
  }

  if (value && ADMIN_WORKSPACE_TABS.includes(value as AdminWorkspaceTab)) {
    return value as AdminWorkspaceTab;
  }

  return fallback;
}

export function routeForAdminWorkspaceTab(tab: AdminWorkspaceTab): string {
  return ADMIN_WORKSPACE_ROUTES[tab];
}
