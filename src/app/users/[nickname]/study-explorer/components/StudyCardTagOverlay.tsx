import type { StudyQueueItem } from "../lib/studyExplorerTypes";

type Props = {
  item: StudyQueueItem;
  bulkModeEnabled: boolean;
  onToggleStudyTag: (subjectId: number, tag: "favorite" | "trouble", enabled: boolean) => void;
};

export default function StudyCardTagOverlay({ item, bulkModeEnabled, onToggleStudyTag }: Props) {
  if (bulkModeEnabled) {
    return undefined;
  }

  const hasActiveTags = Boolean(item.studyTags?.favorite || item.studyTags?.trouble);
  const visibilityClass = hasActiveTags
    ? "opacity-100"
    : "pointer-events-none opacity-0 group-hover/explorer-card:pointer-events-auto group-hover/explorer-card:opacity-100 group-focus-within/explorer-card:pointer-events-auto group-focus-within/explorer-card:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

  return (
    <div className={`absolute inset-x-2 top-2 z-10 flex items-start justify-between transition-opacity ${visibilityClass}`}>
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
            ? "text-black"
            : "text-foreground/20 hover:text-foreground/45"
        }`}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.8 6h8.8a2 2 0 0 1 2 2v4.2a2 2 0 0 1-2 2H9.2l.8 3.2a1.7 1.7 0 0 1-3.3.8L5.6 14.2H3.8a1.8 1.8 0 0 1-1.8-1.8V7.8A1.8 1.8 0 0 1 3.8 6Z" />
          <path d="M14.6 6v8.2" />
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
            ? "text-black"
            : "text-foreground/20 hover:text-foreground/45"
        }`}
      >
        ★
      </button>
    </div>
  );
}
