import type { StudyQueueItem } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";
import {
  SUBJECT_TYPE_DISPLAY,
  SUBJECT_TYPES,
  isSubjectType,
  type SubjectType,
} from "@/lib/domainConstants";

const VIEW_GLYPH_MODAL_DELTA_DESKTOP_PX = 25;
const VIEW_GLYPH_MODAL_DELTA_MOBILE_PX = 10;
const VIEW_GLYPH_MODAL_MIN_SIZE_PX = 320;

export type ViewGlyphFrameSize = {
  width: number;
  height: number;
};

export function resolveViewGlyphFrameSize(
  parentRect?: { width: number; height: number } | null,
): ViewGlyphFrameSize {
  const isMobile = window.matchMedia("(max-width: 639px)").matches;
  const delta = isMobile ? VIEW_GLYPH_MODAL_DELTA_MOBILE_PX : VIEW_GLYPH_MODAL_DELTA_DESKTOP_PX;
  const baseWidth = parentRect?.width ?? window.innerWidth;
  const baseHeight = parentRect?.height ?? window.innerHeight;

  return {
    width: Math.max(VIEW_GLYPH_MODAL_MIN_SIZE_PX, Math.round(baseWidth - delta)),
    height: Math.max(VIEW_GLYPH_MODAL_MIN_SIZE_PX, Math.round(baseHeight - delta)),
  };
}

export function resolveParentFrameRect(): DOMRect | null {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    const activeFrame = activeElement.closest<HTMLElement>("[data-view-glyph-parent-frame='true']");
    if (activeFrame) {
      return activeFrame.getBoundingClientRect();
    }
  }

  const parentFrame = document.querySelector<HTMLElement>("[data-view-glyph-parent-frame='true']");
  if (!parentFrame) {
    return null;
  }

  return parentFrame.getBoundingClientRect();
}

function subjectSingularLabel(value: string | null | undefined): string {
  if (isSubjectType(value)) {
    return SUBJECT_TYPE_DISPLAY[value].singular;
  }

  return SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].singular;
}

export function viewerTitle(item: StudyQueueItem): string {
  return `View ${subjectSingularLabel(item.subjectType)}`;
}

export function usedInVocabularyTargetType(subjectType: string | null | undefined): SubjectType {
  return subjectType === SUBJECT_TYPES.radical ? SUBJECT_TYPES.kanji : SUBJECT_TYPES.vocabulary;
}

export function firstNonEmpty(values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "-";
}
