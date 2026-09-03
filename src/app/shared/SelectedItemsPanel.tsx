"use client";

import { useState } from "react";

import SubjectPill from "./SubjectPill";
import { SUBJECT_SELECTION_COPY } from "./subjectSelection";

/**
 * What you have chosen so far, and a way to drop any of it.
 *
 * The bar said "12 chosen" and showed none of them. Twelve is where you stop
 * trusting a count: you cannot tell whether the one you meant went in, whether
 * the shift-sweep took one too many, or which of them is the mistake - and the
 * only remedy was to clear the lot and start again.
 *
 * So the characters themselves are here, each one removable. Collapsed it is a
 * single line ending in what is left over, because a selection of eighty would
 * otherwise push the buttons off the screen; the whole set is one click away
 * and stays open until it is closed again.
 */

/** Enough to show what a sweep caught without wrapping on a phone. */
const COLLAPSED_LIMIT = 8;

export default function SelectedItemsPanel({
  chosen,
  onRemove,
}: {
  chosen: ReadonlySet<string>;
  /** Dropping one from the set; the same toggle a card click uses. */
  onRemove: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const items = [...chosen];
  if (items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, COLLAPSED_LIMIT);
  const hidden = items.length - shown.length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {shown.map((key) => (
        <SubjectPill
          key={key}
          glyph={key}
          label={`${SUBJECT_SELECTION_COPY.remove} ${key}`}
          onClick={() => onRemove(key)}
          trailing={
            <span aria-hidden="true" className="text-[11px] font-black leading-none text-foreground/60">
              ×
            </span>
          }
        />
      ))}

      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="inline-flex h-6 items-center rounded-full border border-line bg-surface-muted px-2 text-[11px] font-bold text-foreground/70 transition hover:bg-surface"
        >
          {expanded ? SUBJECT_SELECTION_COPY.showFewer : `+${hidden}`}
        </button>
      ) : null}
    </div>
  );
}
