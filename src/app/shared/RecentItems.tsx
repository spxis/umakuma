"use client";

import SubjectGlyph from "@/app/shared/SubjectGlyph";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import {
  RECENT_ITEMS_VISIBLE,
  forgetAllItems,
  forgetItem,
  isSubjectItem,
  recentItemsServerSnapshot,
  recentItemsSnapshot,
  rememberSearch,
  subscribeRecentItems,
  type RecentItem,
} from "@/lib/recentItems";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import { SEARCH_LIST_CARD } from "@/app/search/Search.constants";

/**
 * What this browser has looked up, as the last rows of the results list.
 *
 * Looking a word up is rarely a single act - you check 家, then 家事, then go
 * back to 家 - and retyping it each time is the whole friction. These are rows
 * in the same list rather than a card of their own, because they are read in
 * the same downward sweep as the results; a titled band separates them, since
 * something looked up before is a way back rather than an answer.
 *
 * It holds subjects as well as searches now. Only the typed words were kept
 * before, so searching "water", reading down forty rows and opening 水兵 left
 * the question remembered and the answer forgotten. A subject row shows its
 * glyph and its meaning, so the list reads like the results above it.
 *
 * The list is read through a store subscription rather than into state after
 * mount: the server has no idea what this browser remembers, and rendering a
 * guess would flash the wrong thing before correcting itself.
 */
export default function RecentItems({
  currentQuery,
  variant = "rows",
}: {
  currentQuery: string;
  /** "rows" closes out the results list; "card" stands alone when there is none. */
  variant?: "rows" | "card" | "panel";
}) {
  const history = useSyncExternalStore(
    subscribeRecentItems,
    recentItemsSnapshot,
    recentItemsServerSnapshot,
  );

  /* Arriving at a set of results is what makes a search worth remembering. */
  useEffect(() => {
    rememberSearch(currentQuery);
  }, [currentQuery]);

  if (history.length === 0) return null;

  const rows = (
    <>
      <li className="flex items-center justify-between gap-3 bg-surface-muted px-4 py-2">
        <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
          {SEARCH_PAGE_COPY.recentHeading}
        </h2>
        <button
          type="button"
          onClick={forgetAllItems}
          className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60 underline decoration-dotted underline-offset-2 transition hover:text-foreground/75"
        >
          {SEARCH_PAGE_COPY.recentClear}
        </button>
      </li>

      {history.slice(0, RECENT_ITEMS_VISIBLE).map((item) => (
        <li key={item.href} className="flex items-center gap-1 pr-2">
          <Link
            href={item.href}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
          >
            <ItemGlyph item={item} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-bold text-foreground/80 sm:text-base">
                {isSubjectItem(item) ? (item.meaning ?? item.label) : item.label}
              </span>
              {isSubjectItem(item) && item.meaning ? (
                <span
                  lang="ja"
                  translate="no"
                  className={`truncate text-xs font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}
                >
                  {item.label}
                </span>
              ) : null}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => forgetItem(item.href)}
            aria-label={`${SEARCH_PAGE_COPY.recentForget} ${item.label}`}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/35 transition hover:bg-surface-muted hover:text-foreground"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
              <path d="M5.28 3.86 10 8.59l4.72-4.73a1 1 0 0 1 1.42 1.42L11.41 10l4.73 4.72a1 1 0 0 1-1.42 1.42L10 11.41l-4.72 4.73a1 1 0 0 1-1.42-1.42L8.59 10 3.86 5.28a1 1 0 0 1 1.42-1.42Z" />
            </svg>
          </button>
        </li>
      ))}
    </>
  );

  if (variant === "card") return <ul className={SEARCH_LIST_CARD}>{rows}</ul>;
  /* Inside the suggestion dropdown, which draws its own border and rounding. */
  if (variant === "panel") return <ul className="divide-y divide-line/60">{rows}</ul>;
  return rows;
}

/**
 * The glyph lane, so a remembered row lines up with the results above it.
 *
 * A subject shows itself, in its type's colour, the way it did in the results.
 * A search has no glyph to show and keeps the clock, which is also what tells
 * the two kinds of row apart at a glance.
 */
function ItemGlyph({ item }: { item: RecentItem }) {
  if (!isSubjectItem(item)) {
    return (
      <span className="flex w-20 shrink-0 justify-center text-foreground/35 sm:w-24">
        <HistoryIcon />
      </span>
    );
  }

  return <SubjectGlyph glyph={item.label} subjectType={item.subjectType ?? ""} laneClassName="w-20 shrink-0 sm:w-24" />;
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M10 2a8 8 0 1 0 5.66 13.66 1 1 0 0 0-1.42-1.42A6 6 0 1 1 16 10a1 1 0 1 0 2 0 8 8 0 0 0-8-8Zm-.5 3.5a1 1 0 0 0-1 1V10a1 1 0 0 0 .45.83l2.5 1.67a1 1 0 1 0 1.1-1.66L10.5 9.46V6.5a1 1 0 0 0-1-1Z" />
    </svg>
  );
}
