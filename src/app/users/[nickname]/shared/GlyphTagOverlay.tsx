"use client";

import { SUBJECT_TYPES, type SubjectType, type StudyTag } from "@/lib/domainConstants";

import { useIsRowDensity } from "./explorerCardDensity";
import { BurnedIcon, FavouriteStarIcon, TroubleFaceIcon } from "./studyTagIcons";

type Props = {
  subjectType: SubjectType | undefined;
  studyTags: { favorite: boolean; trouble: boolean; burned?: boolean };
  onToggleStudyTag: (tag: StudyTag) => void;
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
  const hasActiveTags = studyTags.favorite || studyTags.trouble || Boolean(studyTags.burned);
  const inRow = useIsRowDensity();
  const visibilityClass = hasActiveTags
    ? "opacity-100"
    : "pointer-events-none opacity-0 group-hover/explorer-card:pointer-events-auto group-hover/explorer-card:opacity-100 group-focus-within/explorer-card:pointer-events-auto group-focus-within/explorer-card:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

  /*
   * A card places these in the two bottom corners of the glyph box - trouble
   * left, favourite right, as the rest of the app does. A row has no box to
   * put corners in, so they become two buttons in the line, in the same order.
   */
  const wrapperClass = inRow
    ? `flex items-center gap-0.5 transition-opacity ${visibilityClass}`
    : `absolute inset-x-1 bottom-1 z-10 flex items-end justify-between transition-opacity ${visibilityClass}`;

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleStudyTag("trouble");
        }}
        aria-label="Toggle trouble"
        title="Toggle trouble"
        className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-1.5 text-xs font-black leading-none ${studyTags.trouble ? activeToneClass : "text-foreground/20 hover:text-foreground/60"}`}
      >
        <TroubleFaceIcon />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleStudyTag("burned");
        }}
        aria-label="Toggle burned"
        title="Toggle burned"
        className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-1 text-xs font-black leading-none ${studyTags.burned ? "text-amber-600" : "text-foreground/20 hover:text-foreground/60"}`}
      >
        <BurnedIcon />
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
        className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent px-0 text-base font-black leading-none ${studyTags.favorite ? activeToneClass : "text-foreground/20 hover:text-foreground/60"}`}
      >
        <FavouriteStarIcon />
      </button>
    </div>
  );
}
