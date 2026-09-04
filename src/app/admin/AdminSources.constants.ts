/** Copy for the admin source console, in one map for the locale layer. */
export const ADMIN_SOURCES_COPY = {
  label: "Content",
  title: "Sources",
  description:
    "Every source the site borrows from, what we hold from it, and when it last came in. Three are tables a button can refill; the rest are files a script writes into the repo.",
  loading: "Reading every source…",
  needsAuth: "Sign in as an admin to read the sources.",
  loadFailed: "Could not load the sources.",
  unreadable: "This source could not be read.",
  held: "What we hold",
  lastImported: "Last brought in",
  upstreamVersion: "Their release",
  never: "not recorded",
  origin: { database: "Database", file: "File in the repo" },
  refresh: "Refresh",
  refreshing: "Refreshing…",
  runIt: "Run",
  commandHint: "Rebuilt by a script, not by a request.",
  viewPage: "Public page",
  totals: { sources: "Sources", refreshable: "Refreshable here", stale: "Not dated" },
  /* The confirmation template the repo's admin actions use. */
  confirm: {
    title: "Refresh this source?",
    body: (source: string, scope: string) =>
      `Scope: ${source} — ${scope}\nTime: a few seconds to a few minutes.\nRisk: safe to repeat; the import replaces what is there.`,
    accept: "Refresh",
  },
  toast: {
    started: (source: string) => `${source} refresh started.`,
    failed: (source: string) => `${source} refresh failed.`,
  },
  pick: "Choose rows",
  hidePicker: "Done",
  picker: {
    search: "Search this source…",
    reading: "Reading…",
    range: (total: number) => `${total.toLocaleString("en-CA")} rows`,
    none: "Nothing matches.",
    previous: "Prev",
    next: "Next",
    save: "Save",
    saving: "Saving…",
    reset: "Use defaults",
    count: (picked: number, max: number) => `${picked} of ${max} picked`,
    full: (max: number) => `A source shows at most ${max} rows. Untick one first.`,
    saved: (source: string) => `${source} showcase saved.`,
    saveFailed: "Could not save the picks.",
  },
  scopes: {
    wanikani: "re-syncs the subject catalogue from WaniKani",
    kanjiapi: "re-fetches the JLPT enrichment",
  },
} as const;
