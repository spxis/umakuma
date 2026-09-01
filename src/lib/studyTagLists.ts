"use client";

import type { StudyTag } from "@/lib/domainConstants";
import type { StudyQueueItem } from "@/lib/studyQueueTypes";

/**
 * The Trouble and Favorites lists, as a floating panel.
 *
 * The lists are worth reading before a Practice round, from the History page or
 * from either explorer, so the panel is opened by an event the way the glyph
 * viewer is rather than being wired into each page's own state.
 */
export const STUDY_TAG_LIST_EVENT = "wr:study-tag-lists-open";

export type StudyTagListPayload = {
  accountId: string;
  /** Which list opens first. Both are always reachable from the panel. */
  tag?: StudyTag;
  /**
   * A saved list instead of the two tagged ones.
   *
   * A list card offered rename, edit, delete and practise, so the one thing a
   * member could not do with a list they had built was read it. It is the same
   * panel over a different set - a name instead of a flag - rather than a
   * second viewer that would drift from this one.
   */
  list?: { id: string; name: string };
};

/** One tagged item, carrying enough to render a card and open the glyph viewer. */
export type StudyTagListItem = StudyQueueItem & {
  studyTags: { favorite: boolean; trouble: boolean };
};

export function openStudyTagLists(payload: StudyTagListPayload): void {
  if (typeof window === "undefined" || !payload.accountId) {
    return;
  }

  window.dispatchEvent(new CustomEvent<StudyTagListPayload>(STUDY_TAG_LIST_EVENT, { detail: payload }));
}
