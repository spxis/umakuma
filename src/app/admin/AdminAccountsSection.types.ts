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
  /** The family and the helpers: the members the reading challenge is for. */
  internal: boolean;
  /** Switched off by an admin. Null is the ordinary, working state. */
  disabledAt: string | null;
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
  onSetInternal: (accountId: string, internal: boolean) => Promise<void>;
};

export type SortBy = "nickname" | "wkLevel" | "pendingReviews" | "lastSyncedAt" | "createdAt";
export type SortDir = "asc" | "desc";

/** The ids of the per-row menu actions, in their menu order. */
export const ACCOUNT_ROW_ACTION_IDS = {
  manage: "manage",
  viewPage: "viewPage",
  refresh: "refresh",
  setInvite: "setInvite",
  resetInvite: "resetInvite",
  toggleInternal: "toggleInternal",
  history: "history",
} as const;

export type AccountRowActionId = (typeof ACCOUNT_ROW_ACTION_IDS)[keyof typeof ACCOUNT_ROW_ACTION_IDS];

/** One entry in a row's overflow menu. Entries with `href` render as links. */
export type AccountRowMenuAction = {
  id: AccountRowActionId;
  label: string;
  href?: string;
  disabled: boolean;
  /** A short second line explaining why the entry is disabled. */
  disabledReason?: string;
  /** Destructive entries get the warning treatment in the menu. */
  destructive: boolean;
};

/** The one always-visible action plus the row's overflow menu. */
export type AccountRowActions = {
  menu: AccountRowMenuAction[];
};

export type AdminAccountRowActionsProps = {
  nickname: string;
  actions: AccountRowActions;
  onSelect: (actionId: AccountRowActionId) => void;
};
