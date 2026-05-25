import { getLocalStorageItem, setLocalStorageItem } from "@/lib/clientStorage";
import type { FormState } from "./UserReadingSignoffPanel.types";

export type ReadingCheckinMode = "reading" | "wanikani" | "both";

function lastModeStorageKey(memberId: string): string {
  return `wr:reading:last-mode:${memberId}`;
}

export function rememberReadingCheckinMode(memberId: string, mode: ReadingCheckinMode): void {
  setLocalStorageItem(lastModeStorageKey(memberId), mode);
}

export function getRememberedReadingCheckinMode(memberId: string): ReadingCheckinMode | null {
  const value = getLocalStorageItem(lastModeStorageKey(memberId));
  if (value === "reading" || value === "wanikani" || value === "both") {
    return value;
  }

  return null;
}

export function applyReadingCheckinMode(form: FormState, mode: ReadingCheckinMode): FormState {
  if (mode === "wanikani") {
    return {
      ...form,
      bookTitle: "",
      pagesRead: 0,
      minutesRead: 0,
      didWanikaniReviews: true,
    };
  }

  return {
    ...form,
    pagesRead: Math.max(1, form.pagesRead),
    minutesRead: Math.max(10, form.minutesRead),
    didWanikaniReviews: mode === "both",
  };
}
