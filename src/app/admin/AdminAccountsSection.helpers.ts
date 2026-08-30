import { ADMIN_USERS_COPY } from "./AdminUsers.constants";
import {
  ACCOUNT_ROW_ACTION_IDS,
  type AccountRowActions,
  type AdminAccount,
  type SortBy,
  type SortDir,
} from "./AdminAccountsSection.types";

/** A manual refresh right after a sync is a wasted upstream call. */
export const MANUAL_REFRESH_COOLDOWN_MS = 60_000;

export function isManualRefreshOnCooldown(lastSyncedAt: string, nowMs: number = Date.now()): boolean {
  const last = new Date(lastSyncedAt).getTime();
  return nowMs - last < MANUAL_REFRESH_COOLDOWN_MS;
}

export function lockLabel(account: AdminAccount, nowMs: number = Date.now()): string | null {
  if (!account.isSyncing || !account.syncLockUntil) {
    return null;
  }

  const untilMs = new Date(account.syncLockUntil).getTime();
  if (Number.isNaN(untilMs)) {
    return ADMIN_USERS_COPY.lock.fallback;
  }

  const remainingMs = untilMs - nowMs;
  if (remainingMs <= 0) {
    return ADMIN_USERS_COPY.lock.clearing;
  }

  return ADMIN_USERS_COPY.lock.remaining(Math.ceil(remainingMs / 1000));
}

/** Date columns read best newest-first, so they start descending. */
export function initialSortDirFor(sortBy: SortBy): SortDir {
  return sortBy === "lastSyncedAt" || sortBy === "createdAt" ? "desc" : "asc";
}

export function sortAccounts(accounts: AdminAccount[], sortBy: SortBy, sortDir: SortDir): AdminAccount[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...accounts].sort((left, right) => {
    let comparison = 0;

    if (sortBy === "nickname") {
      comparison = left.nickname.localeCompare(right.nickname);
    } else if (sortBy === "wkLevel") {
      comparison = left.wkLevel - right.wkLevel;
    } else if (sortBy === "pendingReviews") {
      comparison = left.pendingReviews - right.pendingReviews;
    } else if (sortBy === "lastSyncedAt") {
      comparison = left.lastSyncedAt.localeCompare(right.lastSyncedAt);
    } else if (sortBy === "createdAt") {
      comparison = left.createdAt.localeCompare(right.createdAt);
    }

    if (comparison === 0) {
      comparison = left.id.localeCompare(right.id);
    }

    return comparison * direction;
  });
}

/**
 * The row's action set: one visible primary (open as the member) and an
 * overflow menu for the rest, so the table is not a wall of buttons.
 */
export function buildAccountRowActions(
  account: AdminAccount,
  options: { busy: boolean; nowMs?: number },
): AccountRowActions {
  const { busy, nowMs = Date.now() } = options;
  const onCooldown = isManualRefreshOnCooldown(account.lastSyncedAt, nowMs);

  return {
    primary: {
      label: ADMIN_USERS_COPY.rowActions.openAsUser,
      href: `/users/${encodeURIComponent(account.wkUsername)}`,
    },
    menu: [
      {
        id: ACCOUNT_ROW_ACTION_IDS.refresh,
        label: ADMIN_USERS_COPY.rowActions.refresh,
        disabled: busy || onCooldown,
        disabledReason: onCooldown ? ADMIN_USERS_COPY.rowActions.refreshCooldown : undefined,
        destructive: false,
      },
      {
        id: ACCOUNT_ROW_ACTION_IDS.setInvite,
        label: ADMIN_USERS_COPY.rowActions.setInvite,
        disabled: busy,
        destructive: false,
      },
      {
        id: ACCOUNT_ROW_ACTION_IDS.resetInvite,
        label: ADMIN_USERS_COPY.rowActions.resetInvite,
        disabled: busy,
        destructive: true,
      },
      {
        id: ACCOUNT_ROW_ACTION_IDS.history,
        label: ADMIN_USERS_COPY.rowActions.history,
        href: `/admin/users/${encodeURIComponent(account.id)}/history`,
        disabled: false,
        destructive: false,
      },
    ],
  };
}
