import { describe, expect, it } from "vitest";

import {
  MANUAL_REFRESH_COOLDOWN_MS,
  buildAccountRowActions,
  initialSortDirFor,
  isManualRefreshOnCooldown,
  lockLabel,
  sortAccounts,
} from "./AdminAccountsSection.helpers";
import { ACCOUNT_ROW_ACTION_IDS, type AdminAccount } from "./AdminAccountsSection.types";

const NOW_MS = Date.parse("2026-08-30T12:00:00.000Z");

function account(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return {
    id: "acc-1",
    nickname: "John",
    wkUsername: "john",
    wkLevel: 12,
    pendingReviews: 4,
    lastSyncedAt: "2026-08-30T10:00:00.000Z",
    lastSyncStatus: "ok",
    isSyncing: false,
    syncLockUntil: null,
    joinedByName: null,
    joinedByEmail: null,
    inviteCodeUpdatedAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isManualRefreshOnCooldown", () => {
  it("is on cooldown inside the window and off at its edge", () => {
    const syncedAt = new Date(NOW_MS - MANUAL_REFRESH_COOLDOWN_MS + 1000).toISOString();
    expect(isManualRefreshOnCooldown(syncedAt, NOW_MS)).toBe(true);

    const syncedLongAgo = new Date(NOW_MS - MANUAL_REFRESH_COOLDOWN_MS).toISOString();
    expect(isManualRefreshOnCooldown(syncedLongAgo, NOW_MS)).toBe(false);
  });
});

describe("lockLabel", () => {
  it("shows nothing when the account is not syncing", () => {
    expect(lockLabel(account(), NOW_MS)).toBeNull();
    expect(lockLabel(account({ isSyncing: true, syncLockUntil: null }), NOW_MS)).toBeNull();
  });

  it("counts down the remaining lock in seconds", () => {
    const lockedFor30s = account({
      isSyncing: true,
      syncLockUntil: new Date(NOW_MS + 30_000).toISOString(),
    });
    expect(lockLabel(lockedFor30s, NOW_MS)).toBe("Locked 30s");
  });

  it("reports a lock past its expiry as clearing", () => {
    const expired = account({
      isSyncing: true,
      syncLockUntil: new Date(NOW_MS - 1000).toISOString(),
    });
    expect(lockLabel(expired, NOW_MS)).toBe("Lock clearing");
  });

  it("falls back to a plain label for an unreadable lock time", () => {
    const garbled = account({ isSyncing: true, syncLockUntil: "not-a-date" });
    expect(lockLabel(garbled, NOW_MS)).toBe("Locked");
  });
});

describe("initialSortDirFor", () => {
  it("starts date columns descending and the rest ascending", () => {
    expect(initialSortDirFor("createdAt")).toBe("desc");
    expect(initialSortDirFor("lastSyncedAt")).toBe("desc");
    expect(initialSortDirFor("nickname")).toBe("asc");
    expect(initialSortDirFor("wkLevel")).toBe("asc");
    expect(initialSortDirFor("pendingReviews")).toBe("asc");
  });
});

describe("sortAccounts", () => {
  const accounts = [
    account({ id: "b", nickname: "Beta", wkLevel: 3, pendingReviews: 9 }),
    account({ id: "a", nickname: "Alpha", wkLevel: 7, pendingReviews: 2 }),
    account({ id: "c", nickname: "Gamma", wkLevel: 3, pendingReviews: 5 }),
  ];

  it("sorts by nickname in both directions", () => {
    expect(sortAccounts(accounts, "nickname", "asc").map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(sortAccounts(accounts, "nickname", "desc").map((item) => item.id)).toEqual(["c", "b", "a"]);
  });

  it("breaks level ties on the account id", () => {
    expect(sortAccounts(accounts, "wkLevel", "asc").map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts numeric and date columns", () => {
    expect(sortAccounts(accounts, "pendingReviews", "asc").map((item) => item.id)).toEqual(["a", "c", "b"]);

    const dated = [
      account({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" }),
      account({ id: "new", createdAt: "2026-08-01T00:00:00.000Z" }),
    ];
    expect(sortAccounts(dated, "createdAt", "desc").map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("does not mutate its input", () => {
    const input = [...accounts];
    sortAccounts(input, "nickname", "asc");
    expect(input.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });
});

describe("buildAccountRowActions", () => {
  const staleSyncedAt = new Date(NOW_MS - MANUAL_REFRESH_COOLDOWN_MS * 2).toISOString();

  /*
   * It was a filled button of its own beside the menu, labelled "Open as
   * user", which read as impersonation. It is a link to the member's page -
   * nothing is done as them - so it sits in the menu with everything else and
   * says what it does.
   */
  it("opens the member's page from the menu, with an encoded href", () => {
    const actions = buildAccountRowActions(account({ wkUsername: "john smith" }), {
      busy: false,
      nowMs: NOW_MS,
    });

    const viewPage = actions.menu.find((item) => item.id === ACCOUNT_ROW_ACTION_IDS.viewPage);
    expect(viewPage?.label).toBe("View page");
    expect(viewPage?.href).toBe("/users/john%20smith");
    expect(viewPage?.destructive).toBe(false);
  });

  it("puts every capability in the menu, in order", () => {
    const actions = buildAccountRowActions(account({ lastSyncedAt: staleSyncedAt }), {
      busy: false,
      nowMs: NOW_MS,
    });

    expect(actions.menu.map((item) => item.id)).toEqual([
      ACCOUNT_ROW_ACTION_IDS.viewPage,
      ACCOUNT_ROW_ACTION_IDS.refresh,
      ACCOUNT_ROW_ACTION_IDS.setInvite,
      ACCOUNT_ROW_ACTION_IDS.resetInvite,
      ACCOUNT_ROW_ACTION_IDS.history,
    ]);
    expect(actions.menu.every((item) => !item.disabled)).toBe(true);
  });

  it("links history to the admin history page for the account id", () => {
    const actions = buildAccountRowActions(account({ id: "id/with slash", lastSyncedAt: staleSyncedAt }), {
      busy: false,
      nowMs: NOW_MS,
    });

    const history = actions.menu.find((item) => item.id === ACCOUNT_ROW_ACTION_IDS.history);
    expect(history?.href).toBe("/admin/users/id%2Fwith%20slash/history");
  });

  it("disables refresh with a reason while the sync cooldown holds", () => {
    const actions = buildAccountRowActions(
      account({ lastSyncedAt: new Date(NOW_MS - 10_000).toISOString() }),
      { busy: false, nowMs: NOW_MS },
    );

    const refresh = actions.menu.find((item) => item.id === ACCOUNT_ROW_ACTION_IDS.refresh);
    expect(refresh?.disabled).toBe(true);
    expect(refresh?.disabledReason).toBe("Synced under a minute ago");
  });

  it("disables the mutating actions while busy, but never the history link", () => {
    const actions = buildAccountRowActions(account({ lastSyncedAt: staleSyncedAt }), {
      busy: true,
      nowMs: NOW_MS,
    });

    const byId = new Map(actions.menu.map((item) => [item.id, item]));
    expect(byId.get(ACCOUNT_ROW_ACTION_IDS.refresh)?.disabled).toBe(true);
    expect(byId.get(ACCOUNT_ROW_ACTION_IDS.setInvite)?.disabled).toBe(true);
    expect(byId.get(ACCOUNT_ROW_ACTION_IDS.resetInvite)?.disabled).toBe(true);
    expect(byId.get(ACCOUNT_ROW_ACTION_IDS.history)?.disabled).toBe(false);
  });

  it("marks only the invite reset as destructive", () => {
    const actions = buildAccountRowActions(account(), { busy: false, nowMs: NOW_MS });
    const destructive = actions.menu.filter((item) => item.destructive).map((item) => item.id);
    expect(destructive).toEqual([ACCOUNT_ROW_ACTION_IDS.resetInvite]);
  });
});
