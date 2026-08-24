import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

export type UserHeaderMenuProps = {
  accountId?: string;
  viewedWkUsername?: string;
  viewerMenuInfo: ViewerMenuInfo | null;
  showAdminActions?: boolean;
  hidden?: boolean;
  lastSyncedAt?: string | null;
  lastActivityAt?: string | null;
};