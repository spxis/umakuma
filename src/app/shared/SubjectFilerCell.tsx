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
  "inline-flex h-6 shrink-0 cursor-pointer items-center truncate rounded-full border px-2 text-[10px] font-bold uppercase tracking-[0.06em] transition";
/*
 * Where the marks are standing.
 *
 * As a column beside a result row they hold their width and keep to the right,
 * and a long list name is cut short rather than pushing the row it belongs to
 * off the screen. As a strip under a subject they have the width of the page
 * and no row to protect: names are shown in full, and the chips wrap within
 * the strip instead of running off the side of a phone.
 */
const VARIANTS = {
  row: { wrapper: "flex-wrap shrink-0 justify-end", chip: "max-w-24" },
  strip: { wrapper: "flex-wrap min-w-0 justify-start", chip: "max-w-64" },
  /*
   * One line that scrolls, for a surface whose height is the point.
   *
   * A member with thirty lists wraps to three rows of chips, and in the glyph
   * viewer those rows come out of the character's own space - the modal is
   * there to show the kanji, not the filing cabinet. Kept to one line, it
   * costs the same 32 pixels whether somebody keeps two lists or forty.
   */
  rail: { wrapper: "flex-nowrap min-w-0 justify-start overflow-x-auto", chip: "max-w-48" },
} as const;

function halt(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export default function SubjectFilerCell({
  hit,
  filer,
  className = "",
  variant = "row",
  marks = "all",
}: {
  hit: FilerHit;
  filer: SubjectFiler;
  /** Beside a row, or as a strip under a subject. */
  variant?: keyof typeof VARIANTS;
  /**
   * Which marks to draw.
   *
   * `lists` is for a surface that already shows trouble and favourite of its
   * own - the glyph viewer draws them inside the glyph, where they have been
   * since long before filing existed. Two sets of the same two buttons a few
   * centimetres apart is not a second chance to press one, it is a question
   * about whether they mean the same thing.
   */
  marks?: "all" | "lists";
  /**
   * Where the cell sits: inline at the end of a wide row, or on a line of its
   * own under a narrow one. A row of chips squeezed beside a glyph in a
   * twenty-rem column left nothing of the row to read.
   */
  className?: string;
}) {
  const tone = subjectGlyphTone(hit.subjectType);
  const tags = filer.tagsFor(hit);
  const taggable = canTag(hit) && marks === "all";
  const listable = canList(hit);
  if (!taggable && !listable) return null;

  const layout = VARIANTS[variant];

  return (
    <span className={`flex items-center gap-1 ${layout.wrapper} ${className}`.trim()} onMouseDown={halt}>
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
                className={`${CHIP} ${layout.chip} ${
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
