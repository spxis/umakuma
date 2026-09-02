"use client";

import type { MouseEvent } from "react";

import { STUDY_TAGS } from "@/lib/domainConstants";
import { canList, canTag, listHolds, type FilerHit } from "@/lib/subjectFiler";
import { FavouriteStarIcon, TroubleFaceIcon } from "@/app/users/[nickname]/shared/studyTagIcons";

import { subjectGlyphTone } from "./subjectListView";
import { SUBJECT_FILER_COPY } from "./studyListCopy";
import type { SubjectFiler } from "./useSubjectFiler";

/**
 * The filing column for one result row: trouble, favourite, then each saved
 * list as a small chip, lit when the row is on it.
 *
 * Quiet on purpose. The column opens beside a list someone is reading, so
 * the marks are the same ones the explorers use, at the same size, dim until
 * they are on. Clicks stop here: the row around it is a link or an option,
 * and filing a kanji must not also open it.
 */
const MARK =
  "inline-flex h-7 min-w-7 shrink-0 cursor-pointer items-center justify-center rounded-md px-1 text-xs font-black leading-none transition";
const CHIP =
  "inline-flex h-6 max-w-24 shrink-0 cursor-pointer items-center truncate rounded-full border px-2 text-[10px] font-bold uppercase tracking-[0.06em] transition";

function halt(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export default function SubjectFilerCell({
  hit,
  filer,
  className = "",
}: {
  hit: FilerHit;
  filer: SubjectFiler;
  /**
   * Where the cell sits: inline at the end of a wide row, or on a line of its
   * own under a narrow one. A row of chips squeezed beside a glyph in a
   * twenty-rem column left nothing of the row to read.
   */
  className?: string;
}) {
  const tone = subjectGlyphTone(hit.subjectType);
  const tags = filer.tagsFor(hit);
  const taggable = canTag(hit);
  const listable = canList(hit);
  if (!taggable && !listable) return null;

  return (
    <span className={`flex shrink-0 flex-wrap items-center justify-end gap-1 ${className}`.trim()} onMouseDown={halt}>
      {taggable ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              halt(event);
              filer.toggleTag(hit, STUDY_TAGS.trouble);
            }}
            aria-pressed={tags.trouble}
            aria-label={SUBJECT_FILER_COPY.toggleTrouble}
            title={SUBJECT_FILER_COPY.toggleTrouble}
            className={`${MARK} ${tags.trouble ? tone : "text-foreground/25 hover:text-foreground/60"}`}
          >
            <TroubleFaceIcon />
          </button>
          <button
            type="button"
            onClick={(event) => {
              halt(event);
              filer.toggleTag(hit, STUDY_TAGS.favorite);
            }}
            aria-pressed={tags.favorite}
            aria-label={SUBJECT_FILER_COPY.toggleFavourite}
            title={SUBJECT_FILER_COPY.toggleFavourite}
            className={`${MARK} text-base ${tags.favorite ? tone : "text-foreground/25 hover:text-foreground/60"}`}
          >
            <FavouriteStarIcon />
          </button>
        </>
      ) : null}

      {listable
        ? (filer.lists ?? []).map((list) => {
            const on = listHolds(list, hit);
            const label = on ? SUBJECT_FILER_COPY.removeFrom(list.name) : SUBJECT_FILER_COPY.addTo(list.name);
            return (
              <button
                key={list.id}
                type="button"
                onClick={(event) => {
                  halt(event);
                  filer.toggleList(hit, list);
                }}
                aria-pressed={on}
                aria-label={label}
                title={label}
                className={`${CHIP} ${
                  on ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/60 hover:bg-surface-muted"
                }`}
              >
                {list.name}
              </button>
            );
          })
        : null}
    </span>
  );
}
