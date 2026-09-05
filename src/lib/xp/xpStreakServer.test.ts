import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The streak awards, which had never fired.
 *
 * `sevenDayStreak` and its three siblings have been priced in `XP_BONUSES`
 * since the economy was written, and nothing computed a streak at award time,
 * so nobody had ever been paid one. The properties that matter now they do:
 * a milestone lands on the day the streak *becomes* that long and never
 * again, the day's first action is the only one that costs a history read,
 * and none of it can fail the review it hangs off.
 */

const store = new Map<string, number>();
let account = { xp: 0, xpLevel: 1 };
/** Days the member has already turned up, before today. */
let history: string[] = [];
let protectedDays: string[] = [];
let readsOfHistory = 0;
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
      upsert: async ({
        where,
        create,
      }: {
        where: { accountId_kind_dayKey: Record<string, string> };
        create: { amount: number };
      }) => {
        const id = where.accountId_kind_dayKey;
        const at = key(id.accountId, id.kind, id.dayKey);
        store.set(at, (store.get(at) ?? 0) + create.amount);
        return { amount: store.get(at) };
      },
      /* The distinct-day read `memberStreak` makes. Counted, because the whole
         design rests on it happening once a day rather than once an answer. */
      findMany: async () => {
        readsOfHistory += 1;
        const days = new Set(history);
        for (const at of store.keys()) days.add(at.split("|")[2]);
        return [...days].sort().map((dayKey) => ({ dayKey }));
      },
    },
    memberRest: { findMany: async () => protectedDays.map((dayKey) => ({ dayKey })) },
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

const { settleDailyStreak, streakDayAwards } = await import("./xpStreakServer");
const { XP_AWARDS, XP_BONUSES } = await import("./xpAwards");

/** Vancouver is seven hours behind in September, so this is the 20th, mid-morning. */
const NOW = new Date("2026-09-20T18:00:00Z");
const TODAY = "2026-09-20";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The `days` days ending yesterday, so today's sign-in makes the streak `days + 1`. */
function runUpTo(days: number): string[] {
  const today = new Date(`${TODAY}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, at) =>
    new Date(today - (days - at) * MS_PER_DAY).toISOString().slice(0, 10),
  );
}

beforeEach(() => {
  store.clear();
  account = { xp: 0, xpLevel: 1 };
  history = [];
  protectedDays = [];
  readsOfHistory = 0;
  transactionFails = false;
});

describe("what a streak of exactly this long earns", () => {
  it("pays a milestone on the day it is reached and not the day after", () => {
    expect(streakDayAwards(30).map((award) => award.kind)).toContain("thirtyDayStreak");
    expect(streakDayAwards(31).map((award) => award.kind)).not.toContain("thirtyDayStreak");
  });

  it("pays the weekly one every seventh day, for as long as somebody keeps going", () => {
    expect(streakDayAwards(14).map((award) => award.kind)).toEqual(["weeklyStreak"]);
    expect(streakDayAwards(15)).toEqual([]);
  });

  it("pays both on day seven, which is the first one that takes any holding", () => {
    expect(streakDayAwards(7).map((award) => award.kind).sort()).toEqual(["sevenDayStreak", "weeklyStreak"]);
  });

  it("says which streak a history line was for", () => {
    expect(streakDayAwards(100)[0].note).toBe("100 days in a row.");
  });

  it("owes nothing to a member on day one", () => {
    expect(streakDayAwards(1)).toEqual([]);
    expect(streakDayAwards(0)).toEqual([]);
  });
});

describe("settling the day", () => {
  it("signs the member in and pays the milestone the day makes", async () => {
    history = runUpTo(29);
    const awarded = await settleDailyStreak({ accountId: "acct", now: NOW });

    expect(awarded).toBe(XP_AWARDS.dailySignIn + XP_BONUSES.thirtyDayStreak);
    expect(store.get(key("acct", "thirtyDayStreak", TODAY))).toBe(XP_BONUSES.thirtyDayStreak);
  });

  it("fires the milestone exactly once, however many answers follow", async () => {
    /* The failure this exists to prevent: settlement runs after every answered
       review, and a member who reaches thirty days then answers another forty
       reviews must be paid once. */
    history = runUpTo(29);
    const first = await settleDailyStreak({ accountId: "acct", now: NOW });
    let rest = 0;
    for (let answer = 0; answer < 40; answer += 1) {
      rest += await settleDailyStreak({ accountId: "acct", now: NOW });
    }

    expect(first).toBe(XP_AWARDS.dailySignIn + XP_BONUSES.thirtyDayStreak);
    expect(rest).toBe(0);
    expect(store.get(key("acct", "thirtyDayStreak", TODAY))).toBe(XP_BONUSES.thirtyDayStreak);
    expect(account.xp).toBe(XP_AWARDS.dailySignIn + XP_BONUSES.thirtyDayStreak);
  });

  it("asks the history once a day rather than once an answer", async () => {
    /* The sign-in is the latch. Without it, every review would run a read over
       the member's whole membership to answer a question that cannot change
       twice in one day. */
    history = runUpTo(29);
    for (let answer = 0; answer < 10; answer += 1) {
      await settleDailyStreak({ accountId: "acct", now: NOW });
    }
    expect(readsOfHistory).toBe(1);
  });

  it("pays nothing extra on day thirty-one", async () => {
    history = runUpTo(30);
    const awarded = await settleDailyStreak({ accountId: "acct", now: NOW });
    expect(awarded).toBe(XP_AWARDS.dailySignIn);
    expect(store.has(key("acct", "thirtyDayStreak", TODAY))).toBe(false);
  });

  it("counts a rest day toward the milestone, because that is what a rest day is for", async () => {
    /* Twenty-eight days studied, one day ill, and the thirtieth is still the
       thirtieth. Nobody loses a milestone to a Tuesday with flu. */
    const full = runUpTo(29);
    protectedDays = [full[10]];
    history = full.filter((dayKey) => dayKey !== full[10]);

    await settleDailyStreak({ accountId: "acct", now: NOW });
    expect(store.get(key("acct", "thirtyDayStreak", TODAY))).toBe(XP_BONUSES.thirtyDayStreak);
  });

  it("swallows a failure rather than failing the review it hangs off", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    history = runUpTo(29);
    transactionFails = true;

    await expect(settleDailyStreak({ accountId: "acct", now: NOW })).resolves.toBe(0);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
