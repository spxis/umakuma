"use client";

import { useEffect, useState } from "react";

import SubjectPill from "@/app/shared/SubjectPill";
import type { LadderRow } from "@/lib/ladder/ladderCrosswalk";

import { UK_EXPLORER_COPY as copy } from "./UmakumaExplorer.constants";

type Hits = { rows: LadderRow[]; total: number };

/**
 * Search across all hundred levels, from whichever one you are looking at.
 *
 * The one thing the paged explorer did better than the other two, kept: the
 * level in the address says what is drawn below, and this says where anything
 * else lives without leaving the page.
 *
 * Results are pills rather than cards, because they are a few items standing
 * in a section of something else - the site's rule for an inline set.
 */
export default function UmakumaLadderSearch({ className }: { className?: string }) {
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<Hits | null>(null);
  const needle = search.trim();
  /* Held rather than cleared in the effect: clearing it there is a synchronous
     setState on the path where nothing has changed, which is the cascading
     render the lint rule is pointing at. An empty box simply draws nothing. */
  const showing = needle ? hits : null;

  useEffect(() => {
    if (!needle) return;
    let live = true;
    /* Debounced: a query over nine thousand rows, and a member types faster
       than the ladder can be filtered. */
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ search: needle, view: "rows" });
      fetch(`/api/uk-ladder?${params}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
        .then((payload: Hits) => {
          if (live) setHits(payload);
        })
        .catch(() => {
          if (live) setHits({ rows: [], total: 0 });
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [needle]);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            /* Escape empties the box, then puts it away - the site's rule. */
            if (event.key !== "Escape") return;
            if (search.length > 0) setSearch("");
            else event.currentTarget.blur();
          }}
          placeholder={copy.searchPlaceholder}
          className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-foreground outline-none focus:border-accent"
        />
        {needle ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted"
          >
            {copy.searchClear}
          </button>
        ) : null}
      </div>

      {showing ? (
        <div className="mt-2">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] tabular-nums text-foreground/60">
            {showing.total === 0 ? copy.searchEmpty : copy.searchHits(showing.rows.length, showing.total)}
          </p>
          {showing.rows.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {showing.rows.map((row) => (
                <SubjectPill
                  key={row.key}
                  glyph={row.characters}
                  subjectType={row.kind}
                  meaning={row.primaryMeaning}
                  ukLevel={row.ukLevel}
                  level={row.wkLevel}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
