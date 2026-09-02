"use client";

import type { StudyQueueItem } from "@/lib/studyQueueTypes";

/**
 * What every list surface calls one of its items.
 *
 * The lists used to open in a floating panel, which is why this file once
 * held an event and an opener. A list has a page now - one view, reached the
 * same way from everywhere - and what is left is the shape the page, the
 * glyph viewer and the shared subject cards all pass between them.
 */
/** One tagged item, carrying enough to render a card and open the glyph viewer. */
export type StudyTagListItem = StudyQueueItem & {
  studyTags: { favorite: boolean; trouble: boolean; burned?: boolean };
};
