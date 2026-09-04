/** What the History page calls itself, in one map for the locale layer. */
export const HISTORY_PAGE_COPY = {
  title: "History",
  subtitle: (nickname: string) => `Study attempt history for ${nickname}.`,
} as const;
