import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";

import { FavouriteStarIcon, TroubleFaceIcon } from "./studyTagIcons";

type Props = {
  subjectType: SubjectType | undefined;
  studyTags: { favorite: boolean; trouble: boolean };
  onToggleStudyTag: (tag: "favorite" | "trouble") => void;
};

export default function GlyphTagOverlay({ subjectType, studyTags, onToggleStudyTag }: Props) {
  const activeToneClass =
    subjectType === SUBJECT_TYPES.radical
      ? "text-radical"
      : subjectType === SUBJECT_TYPES.kanji
        ? "text-kanji"
        : subjectType === SUBJECT_TYPES.vocabulary
          ? "text-vocabulary"
          : "text-foreground";
  const hasActiveTags = studyTags.favorite || studyTags.trouble;
  const visibilityClass = hasActiveTags
    ? "opacity-100"
    : "pointer-events-none opacity-0 group-hover/explorer-card:pointer-events-auto group-hover/explorer-card:opacity-100 group-focus-within/explorer-card:pointer-events-auto group-focus-within/explorer-card:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

  return (
    <div className={`absolute inset-x-1 bottom-1 z-10 flex items-end justify-between transition-opacity ${visibilityClass}`}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleStudyTag("trouble");
        }}
        aria-label="Toggle trouble"
        title="Toggle trouble"
        className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-1.5 text-xs font-black leading-none ${studyTags.trouble ? activeToneClass : "text-foreground/20 hover:text-foreground/45"}`}
      >
        <TroubleFaceIcon />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleStudyTag("favorite");
        }}
        aria-label="Toggle favourite"
        title="Toggle favourite"
        className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-0 text-base font-black leading-none ${studyTags.favorite ? activeToneClass : "text-foreground/20 hover:text-foreground/45"}`}
      >
        <FavouriteStarIcon />
      </button>
    </div>
  );
}
