import type { GameKind } from "./gameMode";
import type { GameRunSummary } from "./gameMode.types";

/**
 * The shape of a game history request, and the words for it.
 *
 * **This module holds no database.** It is imported by the browsing table,
 * which is a client component, and `gameHistoryView.ts` beside it does the
 * reading. The XP history learned that split the hard way: the two were one
 * file, the table pulled Prisma into the browser bundle through a `server-only`
 * import, and typecheck and the whole unit suite passed it - only running the
 * page caught it.
 *
 * **A row is one run**, unlike the XP history, where a row is a day of one kind
 * of earning because `XpEvent` accumulates. `GameRun` does not: every game
 * played is its own row, which is the grain the question this page exists to
 * answer needs. "Four games, ten XP" is only answerable run by run.
 */

export const GAME_HISTORY_SORTS = {
  played: "played",
  score: "score",
  xp: "xp",
} as const;

export type GameHistorySort = (typeof GAME_HISTORY_SORTS)[keyof typeof GAME_HISTORY_SORTS];

export const GAME_HISTORY_SORT_VALUES = Object.values(GAME_HISTORY_SORTS);

export const GAME_HISTORY_SORT_DIRS = { asc: "asc", desc: "desc" } as const;

export type GameHistorySortDir =
  (typeof GAME_HISTORY_SORT_DIRS)[keyof typeof GAME_HISTORY_SORT_DIRS];

export const GAME_HISTORY_PAGE_SIZES = [25, 50, 100] as const;

export const GAME_HISTORY_DEFAULT_PAGE_SIZE = 25;

export type GameHistoryQuery = {
  accountId?: string;
  /** One `GameKind`, or undefined for every game. */
  kind?: string;
  page: number;
  pageSize: number;
  sortBy: GameHistorySort;
  sortDir: GameHistorySortDir;
};

/**
 * A row is a run, in the shape the results panel already draws.
 *
 * Deliberately `GameRunSummary` rather than a history-shaped row of its own:
 * `GameResultXp` reads `xpAwarded` and `xpSkipped` off exactly this type, and
 * a second shape would let the history and the results panel end up saying
 * different things about the same game.
 */
export type GameHistoryRow = GameRunSummary;

/** Every game this account has ever finished, with its counts, for the filter. */
export type GameHistoryFacet = { kind: GameKind; count: number; xp: number };

export type GameHistoryPage = {
  rows: GameHistoryRow[];
  facets: GameHistoryFacet[];
  /** Runs and XP across the whole account, not just this page or this filter. */
  allCount: number;
  allXp: number;
  /** XP across the current filter, which is what the filtered heading reports. */
  filteredXp: number;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

function normalizePage(raw: string | null): number {
  const parsed = Number(raw ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.trunc(parsed);
}

function normalizePageSize(raw: string | null): number {
  const parsed = Number(raw ?? String(GAME_HISTORY_DEFAULT_PAGE_SIZE));
  if (!Number.isFinite(parsed) || parsed < 1) return GAME_HISTORY_DEFAULT_PAGE_SIZE;
  return Math.min(100, Math.trunc(parsed));
}

export function isGameHistorySort(value: unknown): value is GameHistorySort {
  return typeof value === "string" && (GAME_HISTORY_SORT_VALUES as string[]).includes(value);
}

function normalizeSort(raw: string | null): GameHistorySort {
  return isGameHistorySort(raw) ? raw : GAME_HISTORY_SORTS.played;
}

function normalizeDir(raw: string | null): GameHistorySortDir {
  return raw === GAME_HISTORY_SORT_DIRS.asc
    ? GAME_HISTORY_SORT_DIRS.asc
    : GAME_HISTORY_SORT_DIRS.desc;
}

function normalizeKind(raw: string | null): string | undefined {
  const trimmed = raw?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 40) : undefined;
}

export function parseGameHistoryQuery(url: URL): GameHistoryQuery {
  return {
    kind: normalizeKind(url.searchParams.get("kind")),
    page: normalizePage(url.searchParams.get("page")),
    pageSize: normalizePageSize(url.searchParams.get("pageSize")),
    sortBy: normalizeSort(url.searchParams.get("sortBy")),
    sortDir: normalizeDir(url.searchParams.get("sortDir")),
  };
}
