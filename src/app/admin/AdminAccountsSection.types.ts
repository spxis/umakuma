export type AdminAccount = {
  id: string;
  nickname: string;
  wkUsername: string;
  wkLevel: number;
  pendingReviews: number;
  lastSyncedAt: string;
  lastSyncStatus: string;
  isSyncing: boolean;
  syncLockUntil: string | null;
  joinedByName: string | null;
  joinedByEmail: string | null;
  inviteCodeUpdatedAt: string | null;
  createdAt: string;
};

export type AdminAccountsSectionProps = {
  sessionAuthorized: boolean;
  accounts: AdminAccount[];
  loading: boolean;
  viewerEmail?: string | null;
  generatedInviteCodesByAccountId?: Record<string, string>;
  onRefreshOne: (accountId: string) => void;
  onAssignInviteCode: (accountId: string) => Promise<string | null>;
  onResetInviteCode: (accountId: string) => Promise<void>;
};

export type SortBy = "nickname" | "wkLevel" | "pendingReviews" | "lastSyncedAt" | "createdAt";
export type SortDir = "asc" | "desc";
