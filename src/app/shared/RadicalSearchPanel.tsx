"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JP_TEXT_CLASS } from "./japaneseText";
import { RADICAL_SEARCH_COPY } from "./radicalSearchCopy";
import type { RadicalGroup } from "@/lib/radicalSearch";

/**
 * Finding a kanji by the parts you can see.
 *
 * The lookup for a character you cannot read: you cannot type it and you do not
 * know its readings, but you can see 日 on the left and 月 on the right. Pick
 * both and there are thirty-one, commonest first.
 *
 * The radicals are the classical set from RADKFILE - the elements the paper
 * dictionaries index by - and not WaniKani's, which are teaching mnemonics for
 * the two thousand kanji it covers and are named for what they look like.
 *
 * Radicals that can no longer narrow anything are dimmed rather than removed:
 * the grid keeps its shape as you pick, so the one you were reaching for is
 * still where it was.
 */
type Result = {
  groups: RadicalGroup[];
  chosen: string[];
  usable: string[];
  matches: { kanji: string; meaning: string; strokeCount: number | null }[];
  totalMatches: number;
};

const EMPTY: Result = { groups: [], chosen: [], usable: [], matches: [], totalMatches: 0 };

export default function RadicalSearchPanel({ onPick, onClose }: { onPick?: () => void; onClose?: () => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [result, setResult] = useState<Result>(EMPTY);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const query = chosen.length > 0 ? `?radicals=${encodeURIComponent(chosen.join(","))}` : "";
    fetch(`/api/radicals${query}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: Result) => {
        if (!live) return;
        setResult(data);
        setFailed(false);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [chosen]);

  const usable = new Set(result.usable);
  /*
   * The answer on screen is for the picks it came back with. When they differ,
   * a request is in flight - which is what "loading" means here, without a
   * second piece of state to keep in step with the first.
   */
  const settled = [...chosen].sort().join(",") === [...result.chosen].sort().join(",");

  function toggle(radical: string) {
    setChosen((held) => (held.includes(radical) ? held.filter((one) => one !== radical) : [...held, radical]));
  }

  return (
    <div data-panel="radicals" className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {RADICAL_SEARCH_COPY.heading}
        </p>
        {chosen.length === 0 ? (
          <p className="text-xs text-foreground/60">{RADICAL_SEARCH_COPY.hint}</p>
        ) : (
          <p className={`text-sm font-bold text-foreground ${JP_TEXT_CLASS}`}>{result.chosen.join(" ")}</p>
        )}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={RADICAL_SEARCH_COPY.close}
            className="order-last ml-auto h-8 shrink-0 rounded-full border border-line bg-surface px-3 text-xs font-bold text-foreground hover:bg-surface-muted"
          >
            X
          </button>
        ) : null}
        {chosen.length > 0 ? (
          <button
            type="button"
            onClick={() => setChosen([])}
            className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-3 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted"
          >
            {RADICAL_SEARCH_COPY.clear}
          </button>
        ) : null}
      </div>

      {failed ? <p className="py-4 text-sm font-semibold text-foreground/70">{RADICAL_SEARCH_COPY.failed}</p> : null}

      {/*
        The answer is pinned: the grid is fifteen rows tall, and a pick made at
        the bottom of it would otherwise be answered somewhere off the top of
        the panel. It scrolls within itself once there are more matches than
        fit, so the grid underneath keeps the place you were reaching from.
      */}
      <div className="sticky top-0 z-10 mb-3 max-h-[9.5rem] overflow-y-auto border-b border-line bg-surface pb-3">
        {chosen.length === 0 ? (
          <p className="text-sm font-semibold text-foreground/60">{RADICAL_SEARCH_COPY.pick}</p>
        ) : result.totalMatches === 0 ? (
          <p className="text-sm font-semibold text-foreground/60">
            {settled ? RADICAL_SEARCH_COPY.empty : RADICAL_SEARCH_COPY.searching}
          </p>
        ) : (
          <>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
              {RADICAL_SEARCH_COPY.matches(result.totalMatches, result.matches.length)}
            </p>
            <ul className="flex flex-wrap gap-1">
              {result.matches.map((match) => (
                <li key={match.kanji}>
                  <Link
                    href={`/kanji/${encodeURIComponent(match.kanji)}`}
                    onClick={onPick}
                    title={match.meaning}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-lg text-foreground transition hover:border-accent hover:bg-surface-muted ${JP_TEXT_CLASS}`}
                  >
                    {match.kanji}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="space-y-1.5">
        {result.groups.map((group) => (
          <div key={group.strokes} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 w-5 shrink-0 text-right text-[10px] font-bold text-foreground/60">
              {group.strokes}
            </span>
            {group.radicals.map((radical) => {
              const picked = chosen.includes(radical);
              const dead = !picked && !usable.has(radical);
              return (
                <button
                  key={radical}
                  type="button"
                  /*
                   * A mouse pick takes no focus, so nothing scrolls it into
                   * view. The page shell clips its overflow but still scrolls
                   * programmatically, so focusing a radical near the bottom of
                   * the grid dragged the whole panel up out of sight - 400px
                   * of it, on a phone. The keyboard still focuses and still
                   * scrolls, which is what a keyboard reader wants.
                   */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggle(radical)}
                  disabled={dead}
                  aria-pressed={picked}
                  title={RADICAL_SEARCH_COPY.radicalTitle(radical, group.strokes)}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded border text-sm transition ${JP_TEXT_CLASS} ${
                    picked
                      ? "border-accent bg-accent text-white"
                      : dead
                        ? "cursor-not-allowed border-line/60 bg-surface-muted text-foreground/60 opacity-40"
                        : "border-line bg-surface text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {radical}
                </button>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}
