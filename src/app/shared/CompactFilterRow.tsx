"use client";

import { useState, type ReactNode } from "react";

export const COMPACT_FILTER_COPY = {
  expand: (label: string) => `Show every ${label.toLowerCase()} filter`,
  collapse: (label: string) => `Show only the ${label.toLowerCase()} filter that is on`,
} as const;

type Props = {
  /** The row's name, printed at its left and doubling as the expander. */
  label: string;
  /**
   * The chips. Given a class to put on each: on a phone it hides every chip
   * but the one that is on, until the row is opened.
   */
  children: (chipClass: (selected: boolean) => string) => ReactNode;
};

/**
 * A row of filters that costs one line on a phone until you ask for more.
 *
 * The study explorer's level row has done this for a while - `hidden
 * sm:inline-flex` on everything but the chip that is on, with the label and a
 * trailing ellipsis to open it - and History had none of it: three rows drawn
 * in full, which on the UmaKuma ladder came to eighteen lines of chips above
 * the attempts somebody opened the page to read. John: "they should be grouped
 * and take up a maximum of two-3 lines", and "look at the other pages we
 * already have solved this issue and just reuse the code".
 *
 * Phone only. A wide window has the room, and hiding the choices there would
 * be making a reader press something to learn what the filters are.
 */
export default function CompactFilterRow({ label, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const chipClass = (selected: boolean) => (expanded || selected ? "" : "max-sm:hidden");

  return (
    <div className="flex w-full max-w-full flex-wrap items-center gap-2 rounded-xl border border-line px-2.5 py-2">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        title={expanded ? COMPACT_FILTER_COPY.collapse(label) : COMPACT_FILTER_COPY.expand(label)}
        className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/65"
      >
        {label}
        {expanded ? null : <span className="ml-1 text-[11px] leading-none opacity-70 sm:hidden">+</span>}
      </button>
      {children(chipClass)}
      {expanded ? null : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={COMPACT_FILTER_COPY.expand(label)}
          className="ml-auto inline-flex h-7 items-center px-1 text-[12px] font-semibold tracking-[0.2em] text-foreground/60 sm:hidden"
        >
          ...
        </button>
      )}
    </div>
  );
}
