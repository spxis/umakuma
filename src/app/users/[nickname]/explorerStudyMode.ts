import type { StudyModeBehavior } from "./study-explorer/lib/studyExplorerTypes";

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
];

export function parseStudyModeBehavior(input: string | null): StudyModeBehavior | null {
  if (input === "off") {
    return "session";
  }

  if (input === "session" || input === "oneshot" || input === "side-by-side") {
    return input;
  }

  return null;
}