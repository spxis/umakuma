import type { StudyModeBehavior } from "./study-explorer/lib/studyExplorerTypes";

export const STUDY_MODE_STORAGE_KEY = "wr:study-mode";
export const STUDY_MODE_BEHAVIOR_STORAGE_KEY = "wr:study-mode-behavior";
export const STUDY_MODE_BEHAVIOR_QUERY_KEY = "studyModeBehavior";

export const STUDY_MODE_BEHAVIOR_OPTIONS: ReadonlyArray<{
  value: StudyModeBehavior;
  label: string;
  description: string;
}> = [
  {
    value: "session",
    label: "Session",
    description: "Review visible items in one session",
  },
  {
    value: "oneshot",
    label: "Quick",
    description: "Review clicked item only, then close",
  },
  {
    value: "side-by-side",
    label: "Side-by-Side",
    description: "Choose between two similar items",
  },
  {
    value: "game",
    label: "Game",
    description: "Timed rounds and family scoreboards",
  },
];

/** The menu entry that turns study mode off, above the four behaviours. */
export const STUDY_MODE_OFF_OPTION = {
  label: "Off",
  description: "Show meanings and readings",
} as const;

/**
 * Whether study mode is on, from everything that has an opinion.
 *
 * The address wins, then the browser's memory, then whatever it already was.
 * Pure because getting this wrong is invisible: the hook that held it returned
 * `true` from its initialiser, answered `studyMode=off` with `setStudyMode(true)`
 * and wrote `studyMode=on` to the address whatever the member had chosen, so
 * study mode could not be turned off by any means and every surface gated on
 * it - the JLPT explorer's meanings, readings and compounds - stayed hidden.
 */
export function resolveStudyMode({
  urlValue,
  storedValue,
  initialStudyMode,
  current,
}: {
  /** The `studyMode` query parameter, or null when the address says nothing. */
  urlValue: string | null;
  /** `wr:study-mode`, or null when the browser has never been told. */
  storedValue: string | null;
  /** What the page resolved from the query on the server. */
  initialStudyMode: boolean | null;
  current: boolean;
}): boolean {
  if (urlValue === "on" || urlValue === "1") return true;
  if (urlValue === "off" || urlValue === "0") return false;

  /* An address that already decided is not overruled by an older memory. */
  if (typeof initialStudyMode === "boolean") return current;

  if (storedValue === "1") return true;
  if (storedValue === "0") return false;
  return current;
}

export function parseStudyModeBehavior(input: string | null): StudyModeBehavior | null {
  if (input === "off") {
    return "session";
  }

  if (input === "session" || input === "oneshot" || input === "side-by-side" || input === "game") {
    return input;
  }

  return null;
}