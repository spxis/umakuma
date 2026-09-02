"use client";

import { useEffect, useState } from "react";

import { JP_TEXT_CLASS } from "./japaneseText";
import { RADICAL_SEARCH_COPY } from "./radicalSearchCopy";
import type { RadicalGroup } from "@/lib/radicalSearch";

/**
 * Finding a kanji by the parts you can see.
 *
 * The lookup for a character you cannot read: you cannot type it and you do not
 * know its readings, but you can see 日 on the left and 月 on the right. Pick
 * both and the answer is thirty-one characters.
 *
 * It holds no selection of its own. The chosen radicals live in the search box
 * as `:radicals 日 + 月`, this draws whatever the box says, and a pick rewrites
 * the box - so there is one piece of state rather than two that can disagree,
 * the query can be typed by hand, and the answer arrives through the ordinary
 * suggestions underneath instead of inside the picker.
 *
 * The radicals are the classical set from RADKFILE - the elements paper
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
};

const EMPTY: Result = { groups: [], chosen: [], usable: [] };

export default function RadicalSearchPanel({
  chosen,
  onChange,
}: {
  chosen: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const [result, setResult] = useState<Result>(EMPTY);
  const [failed, setFailed] = useState(false);
  const key = chosen.join(",");

  useEffect(() => {
    let live = true;
    const query = key.length > 0 ? `?radicals=${encodeURIComponent(key)}` : "";
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
  }, [key]);

  const usable = new Set(result.usable);

  function toggle(radical: string) {
    onChange(chosen.includes(radical) ? chosen.filter((one) => one !== radical) : [...chosen, radical]);
  }

  return (
    <div data-panel="radicals" className="border-b border-line bg-surface-muted/40">
      {/*
        The command row: what has been picked, and the way out of it. It sits
        under the input and above the results, which is where the reader's eye
        already is - the picked radicals are also written in the box itself, so
        this row is a reminder rather than the only record.
      */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-accent">
          {RADICAL_SEARCH_COPY.heading}
        </span>
        {chosen.length === 0 ? (
          <span className="text-[11px] font-semibold text-foreground/60">{RADICAL_SEARCH_COPY.hint}</span>
        ) : (
          <span className={`text-sm font-bold text-foreground ${JP_TEXT_CLASS}`}>{chosen.join(" ")}</span>
        )}
        {chosen.length > 0 ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange([])}
            className="ml-auto inline-flex h-6 items-center rounded-full border border-line bg-surface px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted"
          >
            {RADICAL_SEARCH_COPY.clear}
          </button>
        ) : null}
      </div>

      {failed ? (
        <p className="px-3 pb-2 text-[11px] font-semibold text-foreground/70">{RADICAL_SEARCH_COPY.failed}</p>
      ) : null}

      {/*
        Bounded and scrolling within itself. The grid is 253 buttons and the
        results below it are the point: left to its full height it pushed every
        answer off the bottom of the screen, which is what the dialog was
        working around before.
      */}
      <div className="max-h-[38vh] space-y-1 overflow-y-auto px-3 pb-3">
        {result.groups.map((group) => (
          <div key={group.strokes} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 w-4 shrink-0 text-right text-[10px] font-bold text-foreground/60">
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
                   * view: focusing a radical near the bottom of the grid used
                   * to drag the whole panel up out of sight. The keyboard
                   * still focuses and still scrolls, which is what a keyboard
                   * reader wants.
                   */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggle(radical)}
                  disabled={dead}
                  aria-pressed={picked}
                  title={RADICAL_SEARCH_COPY.radicalTitle(radical, group.strokes)}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded border text-[13px] leading-none transition ${JP_TEXT_CLASS} ${
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
