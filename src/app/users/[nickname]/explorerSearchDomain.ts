export const EXPLORER_SEARCH_SCOPES = {
  all: "all",
  level: "level",
  jlpt: "jlpt",
  study: "study",
} as const;

export type ExplorerSearchScope =
  (typeof EXPLORER_SEARCH_SCOPES)[keyof typeof EXPLORER_SEARCH_SCOPES];

export type ExplorerSearchBarScope = Exclude<ExplorerSearchScope, "all">;
