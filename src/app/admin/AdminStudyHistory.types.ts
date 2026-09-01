import type { ReviewResult } from "@/lib/domainConstants";

/**
 * One study attempt as the admin table shows it.
 *
 * `characters` arrives beside the id because the id alone made the table a
 * column of five-figure numbers - there was no telling 水 from 火 without
 * looking each one up. Null where the catalogue has no such subject, which is
 * a real state: a subject can be answered and later withdrawn by WaniKani, and
 * then the id is the only honest thing to show.
 */
export type Attempt = {
  id: string;
  accountId: string;
  nickname: string;
  wkUsername: string;
  assignmentId: number;
  subjectId: number;
  characters: string | null;
  subjectType: string;
  result: ReviewResult;
  submittedAt: string;
};

export type HistoryData = {
  attempts: Attempt[];
  totals: Record<string, number>;
  accountCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

export type SortBy =
  | "submittedAt"
  | "nickname"
  | "result"
  | "subjectType"
  | "subjectId"
  | "assignmentId";

export type SortDir = "asc" | "desc";

/** The arrow on a column head: which way it sorts, or that it can. */
export function sortIndicator(activeSortBy: SortBy, sortBy: SortBy, sortDir: SortDir): string {
  if (activeSortBy !== sortBy) {
    return "<>";
  }

  return sortDir === "asc" ? "^" : "v";
}

/**
 * An ISO timestamp as `datetime-local` wants it.
 *
 * The input has no timezone, so the offset is subtracted first - otherwise an
 * attempt made at 8am local opens the editor showing whatever 8am UTC is here.
 */
export function toLocalDateTimeInput(isoValue: string): string {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
