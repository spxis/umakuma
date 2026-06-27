import type { StudyQueueItem } from "../lib/studyExplorerTypes";
import {
  STUDY_PANEL_TEXT,
  isKanjiSubjectType,
  isRadicalSubjectType,
  isVocabularySubjectType,
} from "./StudyExplorer.constants";

type Props = {
  selectedItem: StudyQueueItem;
  selectedTags: { favorite: boolean; trouble: boolean };
  onToggleStudyTag: (tag: "favorite" | "trouble") => void;
};

export default function StudyReviewTagButtons({
  selectedItem,
  selectedTags,
  onToggleStudyTag,
}: Props) {
  const activeToneClass =
    isRadicalSubjectType(selectedItem.subjectType)
      ? "text-radical"
      : isKanjiSubjectType(selectedItem.subjectType)
        ? "text-kanji"
        : isVocabularySubjectType(selectedItem.subjectType)
          ? "text-vocabulary"
          : "text-foreground";

  return (
    <>
      <button
        type="button"
        onClick={() => onToggleStudyTag("favorite")}
        className={`min-h-9 min-w-9 cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1.5 text-base font-bold leading-none ${selectedTags.favorite ? activeToneClass : "text-foreground/20 hover:text-foreground/45"}`}
        title={STUDY_PANEL_TEXT.toggleFavorite}
      >
        ★
      </button>
      <button
        type="button"
        onClick={() => onToggleStudyTag("trouble")}
        className={`min-h-9 min-w-9 cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-bold leading-none ${selectedTags.trouble ? activeToneClass : "text-foreground/20 hover:text-foreground/45"}`}
        title={STUDY_PANEL_TEXT.toggleTrouble}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <path d="M9.2 15.4c.8-.9 1.8-1.4 2.8-1.4s2 .5 2.8 1.4" />
          <circle cx="9.1" cy="10.1" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="14.9" cy="10.1" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </>
  );
}
