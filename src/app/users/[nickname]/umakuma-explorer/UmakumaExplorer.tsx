"use client";

import { useEffect, useState } from "react";

import PillWordsToggle from "@/app/shared/PillWordsToggle";
import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";
import type { LadderRow } from "@/lib/ladder/ladderCrosswalk";
import { LADDER_LEVELS_PER_PAGE as LEVELS_PER_PAGE, type LadderLevelGroup } from "@/lib/ladder/ladderQuery";

import UmakumaLevelCard from "./UmakumaLevelCard";
import UmakumaSearchResults from "./UmakumaSearchResults";
import { UK_EXPLORER_COPY as copy } from "./UmakumaExplorer.constants";

const CHIP = "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition";
const ACTIVE = "border-accent bg-accent text-white";
const IDLE = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";

type Payload = { groups: LadderLevelGroup[]; page: number; pageCount: number; ladderLevels: number };
type Hits = { rows: LadderRow[]; total: number };

/**
 * The UmaKuma curriculum, browsable.
 *
 * The site could already show a member everything WaniKani teaches and
 * everything the JLPT asks for, and nothing at all about the hundred levels
 * built here. This is that missing third: ten levels a page, each one drawn in
 * the order it is met.
 *
 * It fetches rather than receiving the ladder as a prop. The built curriculum
 * is a 351 KB file, and handing it to the client — even once — would put it in
 * the bundle of a page most members open to read two levels of it.
 */
export default function UmakumaExplorer({ initial }: { initial: Payload }) {
  const [page, setPage] = useState(initial.page);
  const [kind, setKind] = useState<SubjectType | null>(null);
  /* Pages already read, kept by number. The server-rendered first page is the
     seed, so opening the explorer costs no fetch, and paging back to a page
     already seen costs none either. Held rather than replaced because it is
     also what keeps the effect from having to write state on the path where
     nothing has changed — the lint rule forbidding a synchronous setState in
     an effect is pointing at a real cascading render. */
  const [pages, setPages] = useState<Record<number, Payload>>({ [initial.page]: initial });
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<Hits | null>(null);
  const searching = search.trim().length > 0;

  const data = pages[page] ?? null;
  const loading = data === null && !failed;

  useEffect(() => {
    if (pages[page]) return;
    let live = true;
    const params = new URLSearchParams({ page: String(page), view: "levels" });
    fetch(`/api/uk-ladder?${params}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((payload: Payload) => {
        if (live) setPages((held) => ({ ...held, [page]: payload }));
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [page, pages]);

  useEffect(() => {
    const needle = search.trim();
    if (!needle) return;
    let live = true;
    /* Debounced, because this is a query over nine thousand rows and a member
       types faster than the ladder can be filtered. */
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ search: needle, view: "rows" });
      fetch(`/api/uk-ladder?${params}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
        .then((payload: Hits) => {
          if (live) setHits(payload);
        })
        .catch(() => {
          if (live) setFailed(true);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search]);

  const groups = data?.groups ?? [];
  const shown = kind
    ? groups.map((group) => ({
        ...group,
        radicals: kind === SUBJECT_TYPES.radical ? group.radicals : [],
        kanji: kind === SUBJECT_TYPES.kanji ? group.kanji : [],
        vocabulary: kind === SUBJECT_TYPES.vocabulary ? group.vocabulary : [],
      }))
    : groups;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-black text-foreground">{copy.browseHeading}</h2>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              /* Escape clears, then puts the box away — the repo's rule. */
              if (event.key !== "Escape") return;
              if (search) setSearch("");
              else event.currentTarget.blur();
            }}
            placeholder={copy.search}
            className="h-8 min-w-64 flex-1 rounded-full border border-line bg-surface px-4 text-sm"
          />
          <label className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-foreground/60">
            {copy.jump}
            <input
              type="number"
              min={1}
              max={initial.ladderLevels}
              onChange={(event) => {
                const wanted = Number(event.target.value);
                if (!Number.isFinite(wanted) || wanted < 1 || wanted > initial.ladderLevels) return;
                /* A hundred levels ten to a page is ten clicks to reach the
                   nineties; this is the way in that a page count is not. */
                setPage(Math.floor((wanted - 1) / LEVELS_PER_PAGE) + 1);
              }}
              className="h-8 w-20 rounded-full border border-line bg-surface px-3 text-sm font-bold tabular-nums"
            />
          </label>
          <button type="button" onClick={() => setKind(null)} className={`${CHIP} ${kind === null ? ACTIVE : IDLE}`}>
            {copy.allKinds}
          </button>
          {([SUBJECT_TYPES.radical, SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary] as SubjectType[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setKind(entry)}
              className={`${CHIP} ${kind === entry ? ACTIVE : IDLE}`}
            >
              {SUBJECT_TYPE_DISPLAY[entry].plural}
            </button>
          ))}
          <span className="ml-auto">
            <PillWordsToggle />
          </span>
        </div>
      </div>

      {failed ? <p className="text-sm font-semibold text-rose-600">{copy.failed}</p> : null}
      {loading ? <p className="text-sm font-semibold text-foreground/60">{copy.loading}</p> : null}

      {searching ? (
        <UmakumaSearchResults hits={hits} kind={kind} />
      ) : (
        <ol className="space-y-3">
          {shown.map((group) => (
            <UmakumaLevelCard key={group.level} group={group} />
          ))}
        </ol>
      )}

      <div className={`flex items-center justify-center gap-3 ${searching ? "hidden" : ""}`}>
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className={`${CHIP} ${IDLE} disabled:opacity-40`}
        >
          {copy.previous}
        </button>
        <span className="text-[11px] font-black tabular-nums text-foreground/70">
          {copy.page(page, data?.pageCount ?? initial.pageCount)}
        </span>
        <button
          type="button"
          disabled={page >= (data?.pageCount ?? initial.pageCount) || loading}
          onClick={() => setPage((current) => Math.min(data?.pageCount ?? initial.pageCount, current + 1))}
          className={`${CHIP} ${IDLE} disabled:opacity-40`}
        >
          {copy.next}
        </button>
      </div>
    </section>
  );
}
