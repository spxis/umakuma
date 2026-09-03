"use client";

import SubjectGlyph from "@/app/shared/SubjectGlyph";
import { useEffect, useRef, type ReactNode, type UIEvent } from "react";

import { SOURCE_TONES } from "@/app/search/Search.constants";
import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import { SEARCH_SOURCE_LABELS, type SearchHit } from "@/lib/globalSearch";
import type { SearchAnswer } from "@/lib/searchAnswers";
import { JP_TEXT_CLASS } from "./japaneseText";
import SubjectFilerCell from "./SubjectFilerCell";
import SearchAnswerBrief from "./SearchAnswerBrief";
import SubjectFilerToggle from "./SubjectFilerToggle";
import { useFilerOpen, useSubjectFiler } from "./useSubjectFiler";

type Props = {
  /** Prefix for option ids, unique per rendered instance. */
  listboxId: string;
  hits: SearchHit[];
  /** What the query worked out rather than found; shown above the rows. */
  answers: SearchAnswer[];
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
  /** The viewer's own account, which is what makes the filing column available. */
  accountId?: string | null;
  /**
   * The left of the options row, under the input and over the answer.
   *
   * Everything that changes how the search behaves shares one row - filing
   * into lists, finding by parts, how big the radicals are drawn - because a
   * second row of options above the first is where a panel starts becoming a
   * page.
   */
  options?: ReactNode;
  /** Under that row: the radical grid, when one is being picked from. */
  grid?: ReactNode;
  /**
   * No "nothing matched" line. A command that has not been given anything to
   * match on yet has not failed to find anything.
   */
  suppressEmpty?: boolean;
};

/** How close to the end counts as near it, in pixels. */
const NEAR_END_PX = 120;

export function suggestOptionId(listboxId: string, index: number): string {
  return `${listboxId}-option-${index}`;
}

/**
 * The dropdown under the header search: the ten best hits, one per subject.
 *
 * Rows are options rather than links because focus never leaves the input -
 * the arrow keys move `activeIndex` and Enter picks, the combobox pattern.
 * Mousedown is swallowed so a click cannot blur the input before it lands.
 */
export default function GlobalSearchSuggestList({
  listboxId,
  hits,
  answers,
  totalHits,
  searching,
  activeIndex,
  onPick,
  onHover,
  onNearEnd,
  loadingMore = false,
  accountId = null,
  options,
  grid,
  suppressEmpty = false,
}: Props) {
  const activeRow = useRef<HTMLLIElement>(null);
  const [filerOpen, setFilerOpen] = useFilerOpen();
  const filing = Boolean(accountId) && filerOpen;
  const filer = useSubjectFiler(accountId, hits, filing);

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const optionsRow =
    options || accountId ? (
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-line/60 px-3 py-1.5">
        {options}
        {accountId ? (
          /*
           * Filing, at the end of the row. A signed-in member sees one quiet
           * phrase; opened, every row grows a column of their own tags and
           * lists, so ten kanji can be searched and kept without leaving the box.
           */
          <span className="ml-auto">
            <SubjectFilerToggle
              open={filerOpen}
              onToggle={() => setFilerOpen((was) => !was)}
              error={filing ? filer.error : null}
            />
          </span>
        ) : null}
      </div>
    ) : null;

  if (hits.length === 0) {
    return (
      <>
        {optionsRow}
        {grid}
        <SearchAnswerBrief answers={answers} />
        {suppressEmpty ? null : (
          <p className="px-4 py-3 text-xs font-semibold text-foreground/60">
            {searching ? SEARCH_PAGE_COPY.suggestSearching : SEARCH_PAGE_COPY.noResults}
          </p>
        )}
      </>
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
    {optionsRow}
    {grid}
    <SearchAnswerBrief answers={answers} />
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
          className={`flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line/60 px-3 py-2 ${
            index === activeIndex ? "bg-surface-muted" : ""
          }`}
        >
          {/*
            * Wide enough for a four-character word at the desktop size; the
            * lane SubjectRows uses, because clipping a vocabulary item to its
            * first character hides the one thing the reader is scanning for.
            * The glyph itself is the row size, not the `sm:text-3xl` this one
            * had grown alone.
            */}
          <SubjectGlyph glyph={hit.glyph} subjectType={hit.subjectType} laneClassName="w-20 shrink-0 sm:w-30" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold text-foreground">{hit.meaning || "—"}</span>
            {hit.reading ? (
              <span lang="ja" translate="no" className={`truncate text-xs font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}>
                {hit.reading}
              </span>
            ) : null}
          </span>
          <span className={`subject-pill shrink-0 border ${SOURCE_TONES[hit.source]}`}>
            {SEARCH_SOURCE_LABELS[hit.source]}
          </span>
          {filing ? <SubjectFilerCell hit={hit} filer={filer} className="basis-full md:max-w-[55%] md:basis-auto" /> : null}
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
        className="border-t border-line/60 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60"
      >
        {SEARCH_PAGE_COPY.suggestMore}
      </p>
    ) : null}
    </>
  );
}
