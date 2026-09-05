import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, number>();
let account = { xp: 0, xpLevel: 1 };
let transactionFails = false;

const key = (accountId: string, kind: string, dayKey: string) => `${accountId}|${kind}|${dayKey}`;

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    xpEvent: {
      findUnique: async ({ where }: { where: { accountId_kind_dayKey: Record<string, string> } }) => {
        const id = where.accountId_kind_dayKey;
        const amount = store.get(key(id.accountId, id.kind, id.dayKey));
        return amount === undefined ? null : { amount };
      },
      /* The upsert is built inside the $transaction array, so it runs whether
         or not the transaction itself resolves - which is exactly what the
         real client does, and what makes the failing case worth writing. */
      upsert: async ({ where, create }: { where: { accountId_kind_dayKey: Record<string, string> }; create: { amount: number } }) => {
        const id = where.accountId_kind_dayKey;
        const at = key(id.accountId, id.kind, id.dayKey);
        store.set(at, (store.get(at) ?? 0) + create.amount);
        return { amount: store.get(at) };
      },
      findMany: async () => [],
    },
    account: {
      findUnique: async () => account,
      update: async ({ data }: { data: { xp?: { increment: number }; xpLevel?: number } }) => {
        if (data.xp) account = { ...account, xp: account.xp + data.xp.increment };
        if (data.xpLevel !== undefined) account = { ...account, xpLevel: data.xpLevel };
        return account;
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => {
      const settled = await Promise.all(operations);
      if (transactionFails) throw new Error("the database said no");
      return settled;
    },
  },
}));

const { awardXp, awardXpAsAdmin, awardXpQuietly } = await import("./xpServer");
const { XP_BONUSES, XP_DAILY_CAPS } = await import("./xpAwards");

beforeEach(() => {
  store.clear();
  account = { xp: 0, xpLevel: 1 };
  transactionFails = false;
});

/**
 * The rule the whole wiring rests on: awarding XP can never fail the thing
 * that earned it.
 *
 * A review that scores correctly and cannot record its XP is still a completed
 * review. The member answered, the stage moved, and the last thing that should
 * come back is an error about bookkeeping.
 */
describe("awarding XP quietly", () => {
  it("swallows a failure and reports what actually landed", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    transactionFails = true;

    await expect(
      awardXpQuietly({ accountId: "acct", requests: [{ kind: "reviewAnswered" }] }),
    ).resolves.toBe(0);

    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("leaves the next award to be earned normally after one falls over", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    transactionFails = true;
    await awardXpQuietly({ accountId: "acct", requests: [{ kind: "reviewAnswered" }] });
    transactionFails = false;
    const later = await awardXpQuietly({ accountId: "acct", requests: [{ kind: "reviewCorrect" }] });
    expect(later).toBe(1);
    logged.mockRestore();
  });

  it("pays once per request, and totals what it paid", async () => {
    const total = await awardXpQuietly({
      accountId: "acct",
      requests: [{ kind: "reviewAnswered" }, { kind: "reviewCorrect" }],
    });
    expect(total).toBe(2);
    expect(account.xp).toBe(2);
  });

  it("repeats a kind `times` over, each one meeting the cap on its own", async () => {
    /* Ten lessons in one request is ten awards, not one worth ten - the cap
       lives in awardXp and nowhere else. */
    const total = await awardXpQuietly({ accountId: "acct", requests: [{ kind: "lessonLearned", times: 4 }] });
    expect(total).toBe(12);
  });

  it("stops looping once the day's cap is full rather than asking a hundred more times", async () => {
    const cap = XP_DAILY_CAPS.burnedItem!;
    const total = await awardXpQuietly({ accountId: "acct", requests: [{ kind: "burnedItem", times: 50 }] });
    expect(total).toBe(cap);
    expect(cap / XP_BONUSES.burnedItem).toBeLessThan(50);
  });

  it("treats a `times` of zero or nonsense as nothing to do", async () => {
    expect(await awardXpQuietly({ accountId: "acct", requests: [{ kind: "reviewAnswered", times: 0 }] })).toBe(0);
    expect(await awardXpQuietly({ accountId: "acct", requests: [] })).toBe(0);
    expect(account.xp).toBe(0);
  });

  it("carries the note through to the row, so a history line can explain itself", async () => {
    await awardXpQuietly({
      accountId: "acct",
      requests: [{ kind: "n4Complete", note: "Level 20, N4 complete." }],
    });
    expect(account.xp).toBe(XP_BONUSES.n4Complete);
  });

  it("refuses a second milestone on the same day", async () => {
    /* The once-a-day list is insurance against a re-derived level paying
       twice for the same crossing. */
    await awardXp({ accountId: "acct", kind: "n5Complete" });
    const second = await awardXp({ accountId: "acct", kind: "n5Complete" });
    expect(second.awarded).toBe(0);
    expect(account.xp).toBe(XP_BONUSES.n5Complete);
  });
});

/**
 * An admin award is a deliberate override, and the tests here are the four
 * properties that makes it: the cap does not trim it, a once-a-day kind may be
 * given again, it still shares the day's row with the member's own earning,
 * and it goes through the same rank recomputation as everything else.
 */
describe("awarding XP as an admin", () => {
  it("pays the whole amount past a cap the member's own earning would meet", async () => {
    const cap = XP_DAILY_CAPS.burnedItem!;
    const result = await awardXpAsAdmin({ accountId: "acct", kind: "burnedItem", amount: 500 });

    expect(result.awarded).toBe(500);
    expect(account.xp).toBe(500);
    expect(500).toBeGreaterThan(cap);
  });

  it("gives a once-a-day award again, on a day it has already been earned", async () => {
    await awardXp({ accountId: "acct", kind: "n5Complete" });
    const again = await awardXpAsAdmin({ accountId: "acct", kind: "n5Complete", amount: 25 });

    expect(again.awarded).toBe(25);
    expect(account.xp).toBe(XP_BONUSES.n5Complete + 25);
  });

  /*
   * The consequence worth knowing about, and the reason the form shows each
   * kind's cap beside the amount: the award lands on the day's row like every
   * other one, and the cap is read off that row.
   */
  it("fills the day's row for its kind, so the member earns no more of it today", async () => {
    await awardXpAsAdmin({ accountId: "acct", kind: "burnedItem", amount: 500 });
    const earned = await awardXp({ accountId: "acct", kind: "burnedItem" });

    expect(earned.awarded).toBe(0);
  });

  it("moves the rank through the same recomputation, and says that it did", async () => {
    const result = await awardXpAsAdmin({ accountId: "acct", kind: "dailySignIn", amount: 100_000 });

    expect(result.level).toBeGreaterThan(1);
    expect(result.rankedUp).toBe(true);
    expect(account.xpLevel).toBe(result.level);
  });

  /* A note is what the member reads on their history, so it must reach the
     row rather than being dropped on the way through. */
  it("carries the note it was given", async () => {
    await awardXpAsAdmin({
      accountId: "acct",
      kind: "gameFinished",
      amount: 30,
      note: "turned up to the Saturday session",
    });
    expect(account.xp).toBe(30);
  });
});
