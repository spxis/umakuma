import type { StudyQueueItem } from "../lib/studyExplorerTypes";
import {
  isKanjiSubjectType,
  isRadicalSubjectType,
  isVocabularySubjectType,
} from "../lib/studyExplorerDomain";

type Props = {
  item: StudyQueueItem;
  bulkModeEnabled: boolean;
  onToggleStudyTag: (subjectId: number, tag: "favorite" | "trouble", enabled: boolean) => void;
};

export default function StudyCardTagOverlay({ item, bulkModeEnabled, onToggleStudyTag }: Props) {
  if (bulkModeEnabled) {
    return undefined;
  }

  const activeToneClass =
    isRadicalSubjectType(item.subjectType)
      ? "text-radical"
      : isKanjiSubjectType(item.subjectType)
        ? "text-kanji"
        : isVocabularySubjectType(item.subjectType)
          ? "text-vocabulary"
          : "text-foreground";

  const hasActiveTags = Boolean(item.studyTags?.favorite || item.studyTags?.trouble);
  const visibilityClass = hasActiveTags
    ? "opacity-100"
    : "pointer-events-none opacity-0 group-hover/explorer-card:pointer-events-auto group-hover/explorer-card:opacity-100 group-focus-within/explorer-card:pointer-events-auto group-focus-within/explorer-card:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

  return (
    <div className={`absolute inset-x-1 top-1 z-10 flex items-start justify-between transition-opacity ${visibilityClass}`}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleStudyTag(item.subjectId, "trouble", !(item.studyTags?.trouble ?? false));
        }}
        aria-label="Toggle trouble"
        title="Toggle trouble"
        className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-1.5 text-xs font-black leading-none ${
          item.studyTags?.trouble
            ? activeToneClass
            : "text-foreground/20 hover:text-foreground/45"
        }`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <path d="M9.2 15.4c.8-.9 1.8-1.4 2.8-1.4s2 .5 2.8 1.4" />
          <circle cx="9.1" cy="10.1" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="14.9" cy="10.1" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleStudyTag(item.subjectId, "favorite", !(item.studyTags?.favorite ?? false));
        }}
        aria-label="Toggle favorite"
        title="Toggle favorite"
        className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-0 text-base font-black leading-none ${
          item.studyTags?.favorite
            ? activeToneClass
            : "text-foreground/20 hover:text-foreground/45"
        }`}
      >
        ★
      </button>
    </div>
  );
}
