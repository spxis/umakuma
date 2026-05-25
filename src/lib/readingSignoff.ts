export const READING_BOOK_OPTIONS = [
  "Kumon Reading",
  "NHK Easy News",
  "Yotsuba",
  "Satori Reader",
  "Genki",
  "Tadoku Book",
  "Other",
] as const;

export type ReadingBookOption = (typeof READING_BOOK_OPTIONS)[number];

export type ReadingSignoffSnapshot = {
  reviewsLeft: number;
  apprenticeCount: number;
  currentWkLevel: number;
};

export type ReadingSignoffRecord = {
  id: string;
  accountId: string;
  signoffDatePst: string;
  bookTitle: string;
  pagesRead: number;
  minutesRead: number;
  didWanikaniReviews: boolean;
  reviewsLeft: number;
  apprenticeCount: number;
  currentWkLevel: number;
  createdAt: string;
  updatedAt: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function isPstDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

export function isMonthKey(value: string): boolean {
  if (!MONTH_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}-01T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

export function toMonthKey(input: Date): string {
  const year = input.getUTCFullYear();
  const month = String(input.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getTodayDateInputValue(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
