import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { XP_ONCE_PER_DAY, xpAwardValue, type XpAwardKind } from "@/lib/xp/xpAwards";
import { xpLevelFor } from "@/lib/xp/xpCurve";
import { gamesPerDayAt } from "@/lib/xp/xpEntitlements";
import {
  chooseDailyQuests,
  completedQuestAwards,
  paidQuestKinds,
  questCounters,
  questReviewsPerActiveDay,
  XP_QUEST_PROFILE_DAYS,
  type XpQuestDay,
} from "@/lib/xp/xpQuests";
import { resolveStreak, streakDayAwards } from "@/lib/xp/xpStreak";
import type { XpAwardRequest } from "@/lib/xp/xpStudyAwards";

/**
 * A member's XP, kept in memory the way `XpEvent` keeps it in the database.
 *
 * The site awards XP through one function, `awardXp`, and settles the day
 * through another, `settleDailyXp`. Both read rows to decide what an award is
 * worth - the day's total for a capped kind, whether a once-a-day kind has
 * fired, the last four weeks for the quests, every day key for the streak.
 * Replaying a member's history through those functions would cost a round
 * trip per award, tens of thousands of times over; this holds the same rows
 * in a map and applies the same rules to them, so the arithmetic is the
 * site's own and only the storage differs.
 *
 * Each method names the server function it mirrors. If one of those changes,
 * change the mirror in the same pass, and the test beside this file will say
 * whether the two still agree on the cases it holds.
 */

export type LedgerRow = {
  kind: string;
  dayKey: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class CohortLedger {
  private readonly rows = new Map<string, LedgerRow>();
  /** Day keys written to since the ledger was loaded, so only those are saved. */
  readonly touchedDays = new Set<string>();
  xp: number;
  xpLevel: number;

  constructor(existing: readonly LedgerRow[] = [], xp?: number) {
    for (const row of existing) this.rows.set(`${row.dayKey}|${row.kind}`, { ...row });
    this.xp = xp ?? existing.reduce((sum, row) => sum + row.amount, 0);
    this.xpLevel = xpLevelFor(this.xp);
  }

  /** Mirrors `awardXp` and `creditXp` in `xpServer.ts`. */
  award(kind: XpAwardKind, at: Date, note?: string | null): number {
    const dayKey = getVancouverDateKey(at);
    const key = `${dayKey}|${kind}`;
    const existing = this.rows.get(key);
    if (existing && XP_ONCE_PER_DAY.includes(kind)) return 0;

    const amount = xpAwardValue(kind, existing?.amount ?? 0, { gamesPerDay: gamesPerDayAt(this.xpLevel) });
    if (amount <= 0) return 0;

    if (existing) {
      existing.amount += amount;
      existing.updatedAt = at;
      if (note) existing.note = note;
    } else {
      this.rows.set(key, { kind, dayKey, amount, note: note ?? null, createdAt: at, updatedAt: at });
    }
    this.touchedDays.add(dayKey);
    this.xp += amount;
    this.xpLevel = xpLevelFor(this.xp);
    return amount;
  }

  /** Mirrors `awardXpQuietly`: one award per `times`, stopping once a cap pays nothing. */
  awardAll(requests: readonly XpAwardRequest[], at: Date): number {
    let total = 0;
    for (const request of requests) {
      const times = Math.max(0, Math.trunc(request.times ?? 1));
      for (let attempt = 0; attempt < times; attempt += 1) {
        const awarded = this.award(request.kind, at, request.note);
        if (awarded <= 0) break;
        total += awarded;
      }
    }
    return total;
  }

  /**
   * Mirrors `settleDailyXp`: the streak first, because it writes the day's
   * sign-in row, then the quests, which read the day's rows.
   */
  settleDay(at: Date, reviewsDue: number): number {
    return this.settleStreak(at) + this.settleQuests(at, reviewsDue);
  }

  /** Mirrors `settleDailyStreak`. The sign-in is the latch: it pays once a day, and only then is the streak looked at. */
  private settleStreak(at: Date): number {
    const signIn = this.award("dailySignIn", at);
    if (signIn <= 0) return 0;
    const standing = resolveStreak(this.dayKeys(), getVancouverDateKey(at), []);
    return signIn + this.awardAll(streakDayAwards(standing.current), at);
  }

  /** Mirrors `settleDailyQuests`. */
  private settleQuests(at: Date, reviewsDue: number): number {
    const dayKey = getVancouverDateKey(at);
    const from = getVancouverDateKey(new Date(at.getTime() - XP_QUEST_PROFILE_DAYS * 24 * 60 * 60 * 1000));
    const window: XpQuestDay[] = [...this.rows.values()]
      .filter((row) => row.dayKey >= from)
      .map((row) => ({ dayKey: row.dayKey, kind: row.kind, amount: row.amount }));
    const todayRows = window.filter((row) => row.dayKey === dayKey);
    const paid = paidQuestKinds(todayRows);
    const already = new Set<string>(paid);
    const outstanding = chooseDailyQuests(questReviewsPerActiveDay(window, dayKey), dayKey).filter(
      (quest) => !already.has(quest.kind),
    );
    if (outstanding.length === 0) return 0;
    const due = outstanding.some((quest) => quest.needsQueue) ? reviewsDue : null;
    return this.awardAll(completedQuestAwards(outstanding, questCounters(todayRows, due), paid), at);
  }

  /** Every day with a row, unordered - what `memberStreak` reads. */
  dayKeys(): string[] {
    return [...new Set([...this.rows.values()].map((row) => row.dayKey))];
  }

  rowsForDay(dayKey: string): LedgerRow[] {
    return [...this.rows.values()].filter((row) => row.dayKey === dayKey);
  }

  /** The rows on every day this run touched, for writing back. */
  touchedRows(): LedgerRow[] {
    return [...this.rows.values()].filter((row) => this.touchedDays.has(row.dayKey));
  }
}
