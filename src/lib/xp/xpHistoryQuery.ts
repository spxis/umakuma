/**
 * The shape of an XP history request, and the words for it.
 *
 * The XP page already shows a ledger, and it loads **every event row on the
 * account** to draw it - `loadXpHistory` has no `take` at all, because it also
 * computes the streak and the split by kind and both need the lot. That is
 * fine for a summary above the fold and wrong for browsing a record that grows
 * every day forever.
 *
 * **This module holds no database.** It is imported by the browsing table,
 * which is a client component, and `xpHistoryView.ts` next to it does the
 * reading. They were one file until the table pulled Prisma into the browser
 * bundle through a `server-only` import - which typecheck and 3,560 unit tests
 * all passed, and only running the page caught. The sort keys, the page sizes
 * and the row shape are shared vocabulary; the query is not.
 *
 * **A row is a day of one kind of earning, not a single award.** `XpEvent` is
 * keyed `[accountId, kind, dayKey]` and accumulates, so fifty reviews on
 * Tuesday are one row. That is the grain the table can honestly offer, and it
 * is why the amount column is a day's total rather than an award.
 */

export const XP_HISTORY_SORTS = {
  day: "day",
  amount: "amount",
  kind: "kind",
} as const;

export type XpHistorySort = (typeof XP_HISTORY_SORTS)[keyof typeof XP_HISTORY_SORTS];

export const XP_HISTORY_SORT_VALUES = Object.values(XP_HISTORY_SORTS);

export const XP_HISTORY_SORT_DIRS = { asc: "asc", desc: "desc" } as const;

export type XpHistorySortDir = (typeof XP_HISTORY_SORT_DIRS)[keyof typeof XP_HISTORY_SORT_DIRS];

export const XP_HISTORY_PAGE_SIZES = [25, 50, 100] as const;

export const XP_HISTORY_DEFAULT_PAGE_SIZE = 25;

export type XpHistoryQuery = {
  accountId?: string;
  /** One `XpType.id`, or undefined for every kind. */
  kind?: string;
  page: number;
  pageSize: number;
  sortBy: XpHistorySort;
  sortDir: XpHistorySortDir;
};

export type XpHistoryRow = {
  /** `[accountId, kind, dayKey]` is unique, so this addresses the row. */
  id: string;
  dayKey: string;
  kind: string;
  /** What the member reads. Falls back to the id for a kind whose type row is gone. */
  label: string;
  amount: number;
  /** The award's own words where it has them, else the type's. */
  note: string | null;
  /** When the first award of this kind landed that day. */
  firstAt: string;
  /** And the last. The row accumulates, so these bracket the day's earning. */
  lastAt: string;
};

export type XpHistoryFacet = { kind: string; label: string; count: number; total: number };

export type XpHistoryPage = {
  rows: XpHistoryRow[];
  /** Every kind this account has ever earned, with its counts, for the filter. */
  facets: XpHistoryFacet[];
  /** Rows and XP across the whole account, not just this page or this filter. */
  allCount: number;
  allTotal: number;
  /** XP across the current filter, which is what the filtered heading reports. */
  filteredTotal: number;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

function normalizePage(raw: string | null): number {
  const parsed = Number(raw ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.trunc(parsed);
}

function normalizePageSize(raw: string | null): number {
  const parsed = Number(raw ?? String(XP_HISTORY_DEFAULT_PAGE_SIZE));
  if (!Number.isFinite(parsed) || parsed < 1) return XP_HISTORY_DEFAULT_PAGE_SIZE;
  return Math.min(100, Math.trunc(parsed));
}

export function isXpHistorySort(value: unknown): value is XpHistorySort {
  return typeof value === "string" && (XP_HISTORY_SORT_VALUES as string[]).includes(value);
}

function normalizeSort(raw: string | null): XpHistorySort {
  return isXpHistorySort(raw) ? raw : XP_HISTORY_SORTS.day;
}

function normalizeDir(raw: string | null): XpHistorySortDir {
  return raw === XP_HISTORY_SORT_DIRS.asc ? XP_HISTORY_SORT_DIRS.asc : XP_HISTORY_SORT_DIRS.desc;
}

function normalizeKind(raw: string | null): string | undefined {
  const trimmed = raw?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 80) : undefined;
}

export function parseXpHistoryQuery(url: URL): XpHistoryQuery {
  return {
    kind: normalizeKind(url.searchParams.get("kind")),
    page: normalizePage(url.searchParams.get("page")),
    pageSize: normalizePageSize(url.searchParams.get("pageSize")),
    sortBy: normalizeSort(url.searchParams.get("sortBy")),
    sortDir: normalizeDir(url.searchParams.get("sortDir")),
  };
}
