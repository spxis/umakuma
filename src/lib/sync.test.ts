import { beforeEach, describe, expect, it, vi } from "vitest";

type AccountRow = {
  id: string;
  tokenEncrypted: string | null;
  tokenIv: string | null;
  tokenTag: string | null;
  lastSyncedAt: Date;
  nextSyncAllowedAt: Date;
  isSyncing: boolean;
  syncLockUntil: Date | null;
  lastSyncStatus: string;
};

let accounts: AccountRow[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findMany: async ({ where }: { where: { tokenEncrypted?: { not: null }; tokenIv?: { not: null }; tokenTag?: { not: null } } }) =>
        accounts.filter(
          (row) =>
            (!where.tokenEncrypted || row.tokenEncrypted !== null) &&
            (!where.tokenIv || row.tokenIv !== null) &&
            (!where.tokenTag || row.tokenTag !== null),
        ),
      findUnique: async ({ where }: { where: { id: string } }) => accounts.find((row) => row.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<AccountRow> }) => {
        const row = accounts.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: { id?: string }; data: Partial<AccountRow> }) => {
        const rows = accounts.filter((row) => (where.id ? row.id === where.id : false));
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      },
    },
  },
}));
vi.mock("@/lib/wanikaniConnection", () => ({ wanikaniConnection: () => null }));
vi.mock("@/lib/wanikani", () => ({ getLeaderboardStats: async () => ({}) }));
vi.mock("@/lib/dailySnapshot", () => ({ upsertDailySnapshot: async () => undefined }));
vi.mock("@/lib/ladder/rankingWeightsServer", () => ({ rankingWeights: async () => ({}) }));

const { refreshAccountById, syncQueueWhere } = await import("./sync");

function account(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: "a1",
    tokenEncrypted: "cipher",
    tokenIv: "iv",
    tokenTag: "tag",
    lastSyncedAt: new Date("2026-09-02T09:57:03.826Z"),
    nextSyncAllowedAt: new Date("2026-09-02T10:00:00.000Z"),
    isSyncing: false,
    syncLockUntil: null,
    lastSyncStatus: "idle",
    ...overrides,
  };
}

beforeEach(() => {
  accounts = [];
});

/*
 * The failure this guards is invisible: nothing errors, nothing logs, and the
 * sweep cheerfully reports two accounts picked. It just picks the same two
 * nothings every time, and every real member stops syncing. John found it in
 * his study history - "my reviews are not showing up in my History!!!" - two
 * days after the last connected account was refreshed.
 */
describe("who the sync sweep may pick", () => {
  it("will not pick an account with no connection", async () => {
    accounts = [account({ id: "johnny", tokenEncrypted: null, tokenIv: null, tokenTag: null }), account({ id: "john" })];
    const { prisma } = await import("@/lib/prisma");
    const picked = await prisma.account.findMany({
      where: syncQueueWhere(new Date(), new Date()),
    });
    expect(picked.map((row: AccountRow) => row.id)).toEqual(["john"]);
  });

  it("asks for a whole token rather than hoping the sync fails politely", () => {
    const where = syncQueueWhere(new Date(), new Date());
    /* All three, because a half-connected account fails at the same point and
       would hold the same place at the head of the queue. */
    expect(where.tokenEncrypted).toEqual({ not: null });
    expect(where.tokenIv).toEqual({ not: null });
    expect(where.tokenTag).toEqual({ not: null });
  });

  it("will not pick an account whose token is only half there", async () => {
    accounts = [account({ id: "half", tokenIv: null }), account({ id: "john" })];
    const { prisma } = await import("@/lib/prisma");
    const picked = await prisma.account.findMany({ where: syncQueueWhere(new Date(), new Date()) });
    expect(picked.map((row: AccountRow) => row.id)).toEqual(["john"]);
  });
});

describe("a claim on an account that cannot be synced", () => {
  it("is put down again rather than left standing", async () => {
    /* Johnny read as "syncing" from 2026-09-02 to the day this was found. */
    accounts = [account({ id: "johnny", tokenEncrypted: null, tokenIv: null, tokenTag: null })];

    const result = await refreshAccountById("johnny", true, true);

    expect(result).toEqual({ refreshed: false, reason: "disconnected" });
    expect(accounts[0]!.isSyncing).toBe(false);
    expect(accounts[0]!.syncLockUntil).toBeNull();
    expect(accounts[0]!.lastSyncStatus).toBe("idle");
  });

  it("does not pretend a sync happened", async () => {
    const before = new Date("2026-09-02T09:57:03.826Z");
    accounts = [account({ id: "johnny", tokenEncrypted: null, tokenIv: null, tokenTag: null, lastSyncedAt: before })];

    await refreshAccountById("johnny", true, true);

    expect(accounts[0]!.lastSyncedAt).toEqual(before);
  });
});
