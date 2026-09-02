"use client";

import { JP_TEXT_CLASS } from "./japaneseText";
import { RADICAL_SEARCH_COPY } from "./radicalSearchCopy";
import { RADICAL_GRID_DEFAULT, RADICAL_GRID_SIZES } from "@/lib/radicalGridSize";
import type { RadicalPicker } from "./useRadicalPicker";

/**
 * The picker's own controls, on the row every other option shares.
 *
 * The row under the input is where a member reaches for anything that changes
 * how the search behaves - filing into lists, finding by parts - so the picker
 * puts its picks, its way out and its sizing there rather than opening a
 * second row of its own above the first.
 */
const SIZE_BUTTON =
  "inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-black text-foreground/75 transition hover:bg-surface-muted disabled:opacity-40";

export default function RadicalPickerControls({ picker }: { picker: RadicalPicker }) {
  return (
    <>
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-accent">
        {RADICAL_SEARCH_COPY.heading}
      </span>
      {picker.picked.length === 0 ? (
        <span className="text-[11px] font-semibold text-foreground/60">{RADICAL_SEARCH_COPY.hint}</span>
      ) : (
        <span className={`text-sm font-bold text-foreground ${JP_TEXT_CLASS}`}>{picker.picked.join(" ")}</span>
      )}
      {picker.picked.length > 0 ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={picker.clear}
          className="inline-flex h-6 items-center rounded-full border border-line bg-surface px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted"
        >
          {RADICAL_SEARCH_COPY.clear}
        </button>
      ) : null}

      {/*
        * How big the radicals are drawn.
        *
        * The grid is read by shape - 冫 and 氵 differ by one stroke - so the
        * size decides whether it can be read at all, and the answer differs
        * between a phone, a desk and a pair of older eyes. Kept per browser.
        */}
      <span className="flex items-center gap-1">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => picker.resize(-1)}
          disabled={picker.size === RADICAL_GRID_SIZES[0]}
          aria-label={RADICAL_SEARCH_COPY.smaller}
          title={RADICAL_SEARCH_COPY.smaller}
          className={SIZE_BUTTON}
        >
          {RADICAL_SEARCH_COPY.smallerMark}
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => picker.resize(1)}
          disabled={picker.size === RADICAL_GRID_SIZES[RADICAL_GRID_SIZES.length - 1]}
          aria-label={RADICAL_SEARCH_COPY.larger}
          title={RADICAL_SEARCH_COPY.larger}
          className={SIZE_BUTTON}
        >
          {RADICAL_SEARCH_COPY.largerMark}
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={picker.resetSize}
          disabled={picker.size === RADICAL_GRID_DEFAULT}
          aria-label={RADICAL_SEARCH_COPY.resetSize}
          title={RADICAL_SEARCH_COPY.resetSize}
          className={SIZE_BUTTON}
        >
          {RADICAL_SEARCH_COPY.resetSizeMark}
        </button>
      </span>
    </>
  );
}
