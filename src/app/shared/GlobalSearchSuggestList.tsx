"use client";

import { useEffect, useRef, type UIEvent } from "react";

import { SOURCE_TONES } from "@/app/search/SearchHitList";
import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import { SEARCH_SOURCE_LABELS, type SearchHit } from "@/lib/globalSearch";
import { JP_TEXT_CLASS } from "./japaneseText";
import { subjectGlyphTone } from "./subjectListView";

type Props = {
  /** Prefix for option ids, unique per rendered instance. */
  listboxId: string;
  hits: SearchHit[];
  /** What the full results page would show, for the footer count. */
  totalHits: number;
  /** True only before the first answer for this query. */
  searching: boolean;
  /** Highlighted option: an index into hits, hits.length for the footer, -1 for none. */
  activeIndex: number;
  onPick: (index: number) => void;
  onHover: (index: number) => void;
  /** Scrolled within reach of the end; the caller asks for the next stretch. */
  onNearEnd?: () => void;
  /** A wider window is on its way, with the rows already shown left in place. */
  loadingMore?: boolean;
};

/** How close to the end counts as near it, in pixels. */
const NEAR_END_PX = 120;

export function suggestOptionId(listboxId: string, index: number): string {
  return `${listboxId}-option-${index}`;
}

/**
 * The dropdown under the header search: the ten best hits, one per glyph.
 *
 * Rows are options rather than links because focus never leaves the input -
 * the arrow keys move `activeIndex` and Enter picks, the combobox pattern.
 * Mousedown is swallowed so a click cannot blur the input before it lands.
 */
export default function GlobalSearchSuggestList({
  listboxId,
  hits,
  totalHits,
  searching,
  activeIndex,
  onPick,
  onHover,
  onNearEnd,
  loadingMore = false,
}: Props) {
  const activeRow = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (hits.length === 0) {
    return (
      <p className="px-4 py-3 text-xs font-semibold text-foreground/55">
        {searching ? SEARCH_PAGE_COPY.suggestSearching : SEARCH_PAGE_COPY.noResults}
      </p>
    );
  }

  /*
   * The mouse gets what the arrows get: scrolling within reach of the end asks
   * for the next stretch, so the list grows under the pointer rather than
   * stopping at ten with no sign there was more.
   */
  function onScroll(event: UIEvent<HTMLUListElement>) {
    if (!onNearEnd) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight <= NEAR_END_PX) onNearEnd();
  }

  return (
    <>
    <ul
      id={listboxId}
      role="listbox"
      aria-label={SEARCH_PAGE_COPY.heading}
      className="max-h-[60vh] overflow-y-auto overscroll-contain"
      onMouseDown={(event) => event.preventDefault()}
      onScroll={onScroll}
    >
      {hits.map((hit, index) => (
        <li
          key={hit.key}
          ref={index === activeIndex ? activeRow : undefined}
          id={suggestOptionId(listboxId, index)}
          role="option"
          aria-selected={index === activeIndex}
          onClick={() => onPick(index)}
          onMouseMove={() => onHover(index)}
          className={`flex cursor-pointer items-center gap-3 border-b border-line/60 px-3 py-2 ${
            index === activeIndex ? "bg-surface-muted" : ""
          }`}
        >
          <span
            /*
             * Wide enough for a four-character word at the desktop size; the
             * lane SubjectRows uses, because clipping a vocabulary item to its
             * first character hides the one thing the reader is scanning for.
             */
            className={`w-20 shrink-0 truncate text-center text-2xl font-black leading-none sm:w-30 sm:text-3xl ${JP_TEXT_CLASS} ${subjectGlyphTone(
              hit.subjectType,
            )}`}
          >
            {hit.glyph}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold text-foreground">{hit.meaning || "—"}</span>
            {hit.reading ? (
              <span lang="ja" translate="no" className={`truncate text-xs font-semibold text-foreground/55 ${JP_TEXT_CLASS}`}>
                {hit.reading}
              </span>
            ) : null}
          </span>
          <span className={`subject-pill shrink-0 border ${SOURCE_TONES[hit.source]}`}>
            {SEARCH_SOURCE_LABELS[hit.source]}
          </span>
        </li>
      ))}

      <li
        ref={activeIndex === hits.length ? activeRow : undefined}
        id={suggestOptionId(listboxId, hits.length)}
        role="option"
        aria-selected={activeIndex === hits.length}
        onClick={() => onPick(hits.length)}
        onMouseMove={() => onHover(hits.length)}
        /*
         * The way out of the dropdown, so it reads as the action it is rather
         * than as an eleventh result: centred, across the full width, set off
         * from the rows above by its own rule.
         */
        className={`flex cursor-pointer items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-accent transition ${
          activeIndex === hits.length ? "bg-accent/10" : "hover:bg-surface-muted"
        }`}
      >
        {SEARCH_PAGE_COPY.suggestSeeAll} {totalHits}{" "}
        {totalHits === 1 ? SEARCH_PAGE_COPY.hit : SEARCH_PAGE_COPY.hits}
        <span aria-hidden="true">→</span>
      </li>
    </ul>
    {loadingMore ? (
      <p
        aria-live="polite"
        className="border-t border-line/60 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45"
      >
        {SEARCH_PAGE_COPY.suggestMore}
      </p>
    ) : null}
    </>
  );
}
