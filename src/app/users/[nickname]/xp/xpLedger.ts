import type { XpActivity } from "@/lib/xp/xpActivity";

/**
 * A member's XP history, as a ledger of days.
 *
 * **A row is a day's earning of one kind, not one award.** `XpEvent` holds one
 * row per account, per kind, per Vancouver day and increments it, so its
 * `createdAt` and `updatedAt` bracket the day rather than timing anything — the
 * fifty reviews behind a single `reviewAnswered` row were answered across the
 * whole of it. Nothing in these types carries a time for that reason: a column
 * of clock times beside amounts would read as a list of moments, and every one
 * of them would be the first award of a day pretending to be the whole of it.
 * The day is the unit the data actually has, so the day is what is shown.
 *
 * The grouping is here and pure so it can be tested without a database, and so
 * the page renders what it is handed rather than reducing while it draws.
 */

export type XpLedgerEntry = {
  kind: string;
  amount: number;
  /**
   * What this day's earning of this kind was for, where the kind's own sentence
   * is not specific enough — "a 30-day streak", "level 20, N4 complete". Null
   * for the routine kinds, whose `typeNote` says everything there is to say.
   */
  note: string | null;
  /** What the kind is called, from `XpType.label`. */
  label: string;
  /** Why the kind exists, in a sentence, from `XpType.note`. */
  typeNote: string;
};

export type XpLedgerRow = XpLedgerEntry & { dayKey: string };

export type XpLedgerDay = {
  dayKey: string;
  /** The day as a member reads it. */
  label: string;
  /** What the whole day was worth. */
  total: number;
  /** Everything earned up to and including this day. */
  runningTotal: number;
  /** The day's kinds, largest first. */
  entries: XpLedgerEntry[];
};

/**
 * `2026-09-04` as a member reads it.
 *
 * Formatted in UTC deliberately. A day key is already the Vancouver day, so
 * re-interpreting it in the reader's zone is the one way to print the wrong
 * date: parsed as UTC midnight and formatted in Vancouver, every day on the
 * ledger would slide back one.
 */
export function formatXpDay(dayKey: string): string {
  const parsed = new Date(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dayKey;
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/** The ledger: newest day first, each day's kinds largest first. */
export function buildXpLedger(
  rows: readonly XpLedgerRow[],
  /**
   * Everything earned before the first day shown.
   *
   * The ledger is windowed now - the page shows recent days, not all of them -
   * and a running total that restarted at the window's edge would tell a
   * member three years in that they were on four hundred XP. The loader knows
   * the lifetime total and the window's own sum, so it hands the difference.
   */
  openingTotal = 0,
): XpLedgerDay[] {
  const byDay = new Map<string, XpLedgerEntry[]>();
  for (const row of rows) {
    const entries = byDay.get(row.dayKey) ?? [];
    entries.push({
      kind: row.kind,
      amount: row.amount,
      note: row.note,
      label: row.label,
      typeNote: row.typeNote,
    });
    byDay.set(row.dayKey, entries);
  }

  /* Ascending first, because a running total only means anything forwards. */
  const ascending = [...byDay.entries()].sort(([left], [right]) => left.localeCompare(right));

  let runningTotal = openingTotal;
  const days = ascending.map(([dayKey, entries]) => {
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    runningTotal += total;
    return {
      dayKey,
      label: formatXpDay(dayKey),
      total,
      runningTotal,
      entries: [...entries].sort(
        (left, right) => right.amount - left.amount || left.label.localeCompare(right.label),
      ),
    };
  });

  return days.reverse();
}

export type XpKindShare = {
  kind: string;
  label: string;
  amount: number;
  /** 0-1 of everything this member has earned. */
  share: number;
};

/**
 * `summariseXpActivity` answers in kind ids; a member reads labels.
 *
 * The join is here rather than in the summary because `XpType` is a table and
 * `xpActivity.ts` is deliberately free of one. A kind with no row left falls
 * back to its own id, which is legible and does not hide the row.
 */
export function labelXpKinds(
  byKind: XpActivity["byKind"],
  labels: ReadonlyMap<string, string>,
): XpKindShare[] {
  return byKind.map((entry) => ({
    kind: entry.kind,
    label: labels.get(entry.kind) ?? entry.kind,
    amount: entry.amount,
    share: entry.share,
  }));
}
