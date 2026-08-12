import type { StudyModeBehavior } from "./study-explorer/lib/studyExplorerTypes";

export const STUDY_MODE_BEHAVIOR_STORAGE_KEY = "wr:study-mode-behavior";
export const STUDY_MODE_BEHAVIOR_QUERY_KEY = "studyModeBehavior";

export const STUDY_MODE_BEHAVIOR_OPTIONS: ReadonlyArray<{
  value: StudyModeBehavior;
  label: string;
  description: string;
}> = [
  {
    value: "off",
    label: "Off",
    description: "No study mode helpers",
  },
  {
    value: "session",
    label: "Session",
    description: "Review visible items in one session",
  },
  {
    value: "oneshot",
    label: "Quick mode",
    description: "Review clicked item only, then close",
  },
];

export function parseStudyModeBehavior(input: string | null): StudyModeBehavior | null {
  if (input === "off" || input === "session" || input === "oneshot") {
    return input;
  }

  return null;
}