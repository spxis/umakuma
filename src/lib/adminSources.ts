import { SOURCE_KEYS, type SourceKey } from "./sourceCredits";

/**
 * Where each source's data actually lives, and how it is brought up to date.
 *
 * The accreditation pages answer this for a reader - what we hold and when it
 * came in. They cannot answer it for the person who has to act on it, because
 * the two halves of "is this current?" have different remedies. Three sources
 * are tables that a button can refill. The rest are files built into the repo
 * by a script, and no button on a deployed site can rewrite them: Vercel's
 * filesystem is read-only, and JMdict alone is a 63MB download.
 *
 * So a file-backed source names its command instead of offering an action it
 * cannot honour, which is the choice `AdminContentSourcesPanel` already made
 * for grades and maps. A button that fails is worse than a command that works.
 */

export const SOURCE_ORIGINS = {
  database: "database",
  file: "file",
} as const;

export type SourceOrigin = (typeof SOURCE_ORIGINS)[keyof typeof SOURCE_ORIGINS];

export type SourceOperation = {
  origin: SourceOrigin;
  /** The endpoint that refills it, where a request can. */
  endpoint: string | null;
  /** The command that rebuilds it, where only a terminal can. */
  command: string | null;
};

/**
 * One row per source. `endpoint` and `command` are exclusive: a source is
 * refreshed by a request or by a script, never described as both, so the panel
 * has one thing to draw and the reader has one thing to do.
 */
export const SOURCE_OPERATIONS: Record<SourceKey, SourceOperation> = {
  [SOURCE_KEYS.wanikani]: {
    origin: SOURCE_ORIGINS.database,
    endpoint: "/api/admin/wk-catalog/sync",
    command: null,
  },
  [SOURCE_KEYS.kanjiapi]: {
    origin: SOURCE_ORIGINS.database,
    endpoint: "/api/admin/jlpt/refresh",
    command: null,
  },
  /* The sentence ingest reads a multi-hundred-megabyte export and writes a
     quarter of a million rows; it belongs in a terminal, not in a request. */
  [SOURCE_KEYS.tatoeba]: {
    origin: SOURCE_ORIGINS.database,
    endpoint: null,
    command: "pnpm sentences:ingest",
  },
  [SOURCE_KEYS.kanjidic2]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm kanji:build" },
  [SOURCE_KEYS.kanjivg]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm strokes:build" },
  [SOURCE_KEYS.radkfile]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm radicals:build" },
  /* Both halves of the frequency file come out of one run, so both say so. */
  [SOURCE_KEYS.jmdict]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm ladder:refresh" },
  [SOURCE_KEYS.jiten]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm ladder:refresh" },
  [SOURCE_KEYS.curriculum]: {
    origin: SOURCE_ORIGINS.file,
    endpoint: null,
    command: "pnpm db:seed:school-grades",
  },
  [SOURCE_KEYS.jpmap]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm map:build:all" },
  [SOURCE_KEYS.usmap]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm map:build:all" },
  [SOURCE_KEYS.worldmap]: { origin: SOURCE_ORIGINS.file, endpoint: null, command: "pnpm map:build:all" },
};

/** Whether a request can bring this source up to date, or only a terminal can. */
export function isRefreshable(key: SourceKey): boolean {
  return SOURCE_OPERATIONS[key].endpoint !== null;
}
