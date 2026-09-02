"use client";

import { Fragment, useEffect, useState } from "react";

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
  /*
   * What the server made of what was typed. A command may name a radical in
   * English - `:radicals sun + moon` - so the characters to highlight, and to
   * write back when one is clicked, are the resolved ones rather than the
   * words the box happens to hold.
   */
  const picked = result.chosen;

  function toggle(radical: string) {
    onChange(picked.includes(radical) ? picked.filter((one) => one !== radical) : [...picked, radical]);
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
        {picked.length === 0 ? (
          <span className="text-[11px] font-semibold text-foreground/60">{RADICAL_SEARCH_COPY.hint}</span>
        ) : (
          <span className={`text-sm font-bold text-foreground ${JP_TEXT_CLASS}`}>{picked.join(" ")}</span>
        )}
        {picked.length > 0 ? (
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
      <div className="max-h-[38vh] overflow-y-auto px-3 pb-3">
        {/*
          One run rather than a row per stroke count.
          *
          * A row each wasted most of its width on the counts holding three
          * radicals - fourteen strokes is 鼻 and 齊 - and made the grid twice
          * as tall as it needed to be, which is the space the answers want.
          * Flowing them left to right with the count as a marker is how the
          * paper dictionaries print it and how Jisho draws it.
        */}
        <div className="flex flex-wrap items-center gap-1">
          {result.groups.map((group) => (
            <Fragment key={group.strokes}>
              <span
                title={RADICAL_SEARCH_COPY.strokeTitle(group.strokes)}
                className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-foreground/70 px-1 text-[10px] font-black leading-none text-surface"
              >
                {group.strokes}
              </span>
              {group.radicals.map((radical) => {
                const isPicked = picked.includes(radical);
                const dead = !isPicked && !usable.has(radical);
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
                    aria-pressed={isPicked}
                    title={RADICAL_SEARCH_COPY.radicalTitle(radical, group.strokes)}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded border text-[13px] leading-none transition ${JP_TEXT_CLASS} ${
                      isPicked
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
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
