"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import StrokeOrderButton from "@/app/shared/StrokeOrderButton";

import {
  SEARCH_PAGE_SIZE,
  SEARCH_SOURCE_LABELS,
  appendHits,
  searchHitHref,
  searchRequestUrl,
  type SearchHit,
  type SearchResults,
  type SearchSource,
} from "@/lib/globalSearch";
import { subjectGlyphTone } from "@/app/shared/subjectListView";

import { SEARCH_PAGE_COPY } from "./searchCopy";
import { SEARCH_RESULT_ROW_ATTR, focusSearchInput, focusSearchResultRow } from "./searchFocus";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

type Props = {
  /** The first stretch, rendered on the server with the page. */
  hits: SearchHit[];
  /** Whose explorers a hit opens; null when nobody is signed in. */
  viewerUsername: string | null;
  /** The query these answer, for asking for the stretch after this one. */
  query: string;
  /** The source filter in force, so later stretches stay inside it. */
  activeSource: SearchSource | null;
  /** Everything the search found, which is more than the first stretch. */
  totalHits: number;
};

/** How near the last row the reader gets before the next stretch is asked for. */
const LOAD_LEAD_ROWS = 3;

/** Source accents, so a row's origin reads before the label does. */
export const SOURCE_TONES: Record<SearchSource, string> = {
  wanikani: "border-sky-300 bg-sky-50 text-sky-700",
  jlpt: "border-emerald-300 bg-emerald-50 text-emerald-700",
  grades: "border-kanji/40 bg-kanji/10 text-kanji",
};

/**
 * Search results as one ranked list rather than three stacked ones.
 *
 * A learner asking "where does 鉛筆 live" wants the best answer first,
 * whichever catalogue holds it; grouping by source would make them read three
 * lists and compare. The source rides along as a pill instead.
 */
export default function SearchHitList({ hits, viewerUsername, query, activeSource, totalHits }: Props) {
  /*
   * What the page arrived with, plus every stretch fetched since - kept under
   * the query it answers, so navigating to a new search drops the old tail
   * during the render that brings the new rows rather than one paint later.
   */
  const windowKey = `${query}|${activeSource ?? "all"}`;
  const [loaded, setLoaded] = useState<{ key: string; extra: SearchHit[] }>({ key: windowKey, extra: [] });
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const rows = appendHits(hits, loaded.key === windowKey ? loaded.extra : []);
  const hasMore = rows.length < totalHits;

  const loadMore = useCallback(async () => {
    if (inFlight.current || rows.length >= totalHits) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const response = await fetch(
        searchRequestUrl(query, {
          sources: activeSource ? [activeSource] : undefined,
          limit: SEARCH_PAGE_SIZE,
          offset: rows.length,
        }),
      );
      if (response.ok) {
        const payload = (await response.json()) as SearchResults;
        setLoaded((previous) => ({
          key: windowKey,
          extra: appendHits(previous.key === windowKey ? previous.extra : [], payload.hits ?? []),
        }));
      }
    } catch {
      /* The button stays; a failed stretch is worth retrying, not reporting. */
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [activeSource, query, rows.length, totalHits, windowKey]);

  /* Reading to the end asks for more, the way a phone list loads the next screenful. */
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface-muted p-5">
        <p className="text-sm font-bold text-foreground/75">{SEARCH_PAGE_COPY.noResults}</p>
        <p className="mt-1 text-xs font-semibold text-foreground/55">{SEARCH_PAGE_COPY.noResultsHint}</p>
      </div>
    );
  }

  /*
   * The arrows walk the rows, and off the top they hand focus back to the
   * search box - the same movement that was already walking the suggestions,
   * continued into the results, so the whole search is reachable without ever
   * reaching for the mouse. Arrowing toward the end pages, like scrolling does.
   */
  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const row = (event.target as HTMLElement).closest<HTMLElement>(`[${SEARCH_RESULT_ROW_ATTR}]`);
    const index = Number(row?.getAttribute(SEARCH_RESULT_ROW_ATTR) ?? -1);
    if (index < 0) return;

    event.preventDefault();
    if (event.key === "ArrowUp" && index === 0) {
      focusSearchInput();
      return;
    }
    if (event.key === "ArrowDown" && index + LOAD_LEAD_ROWS >= rows.length) void loadMore();
    focusSearchResultRow(event.key === "ArrowDown" ? index + 1 : index - 1);
  }

  return (
    <>
      <ul
        className="overflow-hidden rounded-2xl border border-line bg-surface divide-y divide-line/60"
        onKeyDown={onKeyDown}
      >
        {rows.map((hit, index) => (
          <li key={hit.key}>
            <HitRow hit={hit} index={index} href={searchHitHref(hit, viewerUsername)} />
          </li>
        ))}
      </ul>

      <div ref={sentinel} className="mt-3 text-center">
        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-bold text-foreground/75 transition hover:bg-surface-muted disabled:opacity-60"
          >
            {loading ? SEARCH_PAGE_COPY.loadingMore : SEARCH_PAGE_COPY.loadMore}
          </button>
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/40">
            {SEARCH_PAGE_COPY.endOfResults}
          </p>
        )}
      </div>
    </>
  );
}

function HitRow({ hit, index, href }: { hit: SearchHit; index: number; href: string | null }) {
  const body = (
    <>
          <span
            /* Three characters fit at every width; 私自身 clipped to 私 at the old w-16. */
            className={`w-20 shrink-0 truncate text-center text-2xl font-black leading-none sm:w-24 ${JP_TEXT_CLASS} ${subjectGlyphTone(
              hit.subjectType,
            )}`}
          >
            {hit.glyph}
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold text-foreground sm:text-base">
              {hit.meaning || "—"}
            </span>
            {hit.reading ? (
              <span lang="ja" translate="no" className={`truncate text-xs font-semibold text-foreground/55 ${JP_TEXT_CLASS}`}>
                {hit.reading}
              </span>
            ) : null}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {hit.badges.map((badge) => (
              <span key={badge} className="subject-pill hidden border-line bg-surface text-foreground sm:inline-flex">
                {badge}
              </span>
            ))}
            <span className={`subject-pill border ${SOURCE_TONES[hit.source]}`}>
              {SEARCH_SOURCE_LABELS[hit.source]}
            </span>
          </span>
    </>
  );

  const shell =
    "flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40";
  const rowProps = { [SEARCH_RESULT_ROW_ATTR]: index };

  /*
   * The strokes button sits outside the row link. Nesting a button inside an
   * anchor is invalid, and the click would be swallowed by the navigation.
   */
  return (
    <div className="flex items-center gap-1 pr-2">
      {href ? (
        <Link href={href} className={shell} {...rowProps}>
          {body}
        </Link>
      ) : (
        /* Not a link for a signed-out reader, but still a stop for the arrows. */
        <div className={shell} tabIndex={-1} {...rowProps}>
          {body}
        </div>
      )}
      {isSingleKanji(hit) ? <StrokeOrderButton kanji={hit.glyph} meaning={hit.meaning} /> : null}
    </div>
  );
}

/** Stroke order exists for single kanji, not radicals drawn as images or words. */
function isSingleKanji(hit: SearchHit): boolean {
  return hit.subjectType === "kanji" && [...hit.glyph].length === 1;
}
