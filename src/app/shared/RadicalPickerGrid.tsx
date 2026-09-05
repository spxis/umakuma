"use client";

import { Fragment } from "react";

import { JP_TEXT_CLASS } from "./japaneseText";
import { RADICAL_TILE_CLASS } from "./radicalTileClass";
import { RADICAL_SEARCH_COPY } from "./radicalSearchCopy";
import { RADICAL_GRID_CLASSES } from "@/lib/radicalGridSize";
import type { RadicalPicker } from "./useRadicalPicker";

/**
 * The classical radicals, in one run rather than a row per stroke count.
 *
 * A row each wasted most of its width on the counts holding three radicals -
 * fourteen strokes is 鼻 and 齊 - and made the grid twice as tall as it needed
 * to be, which is the space the answers want. Flowing them left to right with
 * the count as a marker is how the paper dictionaries print it.
 *
 * Radicals that can no longer narrow anything are dimmed rather than removed:
 * the grid keeps its shape as you pick, so the one you were reaching for is
 * still where it was.
 */
export default function RadicalPickerGrid({ picker }: { picker: RadicalPicker }) {
  const { cell, marker } = RADICAL_GRID_CLASSES[picker.size];

  return (
    <div data-panel="radicals" className="border-b border-line/60 bg-surface-muted/40">
      {picker.failed ? (
        <p className="px-3 py-2 text-[11px] font-semibold text-foreground/70">{RADICAL_SEARCH_COPY.failed}</p>
      ) : null}

      {/*
        Bounded and scrolling within itself: the grid is 253 buttons and the
        results below it are the point, so it must not push them off the screen.
      */}
      <div className="max-h-[38vh] overflow-y-auto px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {picker.groups.map((group) => (
            <Fragment key={group.strokes}>
              <span
                title={RADICAL_SEARCH_COPY.strokeTitle(group.strokes)}
                className={`inline-flex items-center justify-center rounded bg-foreground/70 px-1 font-black leading-none text-surface ${marker}`}
              >
                {group.strokes}
              </span>
              {group.radicals.map((radical) => {
                const isPicked = picker.picked.includes(radical);
                const dead = !isPicked && !picker.usable.has(radical);
                return (
                  <button
                    key={radical}
                    type="button"
                    /*
                     * A mouse pick takes no focus, so nothing scrolls it into
                     * view: focusing a radical near the bottom of the grid used
                     * to drag the whole panel out of sight. The keyboard still
                     * focuses and still scrolls, which is what it wants.
                     */
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => picker.toggle(radical)}
                    disabled={dead}
                    aria-pressed={isPicked}
                    title={RADICAL_SEARCH_COPY.radicalTitle(radical, group.strokes)}
                    className={`inline-flex items-center justify-center rounded border leading-none transition ${cell} ${JP_TEXT_CLASS} ${
                      isPicked
                        ? RADICAL_TILE_CLASS.chosen
                        : dead
                          ? RADICAL_TILE_CLASS.deadEnd
                          : RADICAL_TILE_CLASS.rest
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
