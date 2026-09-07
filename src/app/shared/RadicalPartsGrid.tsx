"use client";

import Link from "next/link";
import { Fragment } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { RADICAL_TILE_CLASS } from "@/app/shared/radicalTileClass";
import { RADICAL_GRID_CLASSES, RADICAL_GRID_DEFAULT } from "@/lib/radicalGridSize";
import { togglePart } from "@/lib/radicalBrowser";
import type { RadicalGroup } from "@/lib/radicalSearch";

import { RADICAL_PARTS_COPY } from "./radicalPartsCopy";

/**
 * The 253 radicals, as a thing to pick from.
 *
 * Two pages ask the same question of the same index and must not grow two
 * grids: /radicals asks "which kanji have these parts", and a stroke page
 * asks "which of these 49 has a mouth in it". The difference between them is
 * one function - where a tile leads - so that is the prop, and everything
 * else about the grid is settled here.
 *
 * **A tile that would return nothing is never a link.** It is dimmed and says
 * why, which is the promise the pages make: whatever is still pickable has
 * something behind it. The caller decides what "still pickable" means for its
 * own page and passes the set; the grid only draws the answer.
 *
 * One run rather than a block per stroke count, with the count as a marker:
 * a block each wasted most of its width on the counts holding three radicals
 * and made the grid four screens tall. This is how the paper dictionaries
 * print it, and how the picker in search has always drawn it.
 */
export default function RadicalPartsGrid({
  groups,
  chosen,
  usable,
  names,
  hrefFor,
  className = "",
}: {
  /** Every radical there is, in stroke order. The grid never shows a subset. */
  groups: RadicalGroup[];
  chosen: string[];
  /** What can still narrow what is left. Everything else is drawn as a dead end. */
  usable: ReadonlySet<string>;
  /** The English name for each radical, where one is known. */
  names: Record<string, string>;
  /** Where picking one leads, given the parts that would be chosen after it. */
  hrefFor: (parts: string[]) => string;
  className?: string;
}) {
  /* The same cell and marker sizes the picker draws, so the two match. */
  const { cell, marker } = RADICAL_GRID_CLASSES[RADICAL_GRID_DEFAULT];

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {groups.map((group) => (
        <Fragment key={group.strokes}>
          <span
            title={RADICAL_PARTS_COPY.strokeTitle(group.strokes)}
            className={`inline-flex items-center justify-center rounded bg-foreground/70 px-1 font-black leading-none text-surface ${marker}`}
          >
            {group.strokes}
          </span>
          {group.radicals.map((radical) => {
            const on = chosen.includes(radical);
            const dead = !on && !usable.has(radical);
            const box = `inline-flex items-center justify-center rounded border leading-none transition ${cell} ${JP_TEXT_CLASS}`;
            const glyph = (
              <span lang="ja" translate="no">
                {radical}
              </span>
            );

            /*
             * A dead end is not a destination, so it is not a link. The
             * dimming is faint enough to read as unavailable and dark enough
             * to still be a character.
             */
            return dead ? (
              <span key={radical} title={RADICAL_PARTS_COPY.deadEnd} className={`${box} ${RADICAL_TILE_CLASS.deadEnd}`}>
                {glyph}
              </span>
            ) : (
              <Link
                key={radical}
                href={hrefFor(togglePart(chosen, radical))}
                aria-pressed={on}
                title={names[radical] ?? RADICAL_PARTS_COPY.strokeTitle(group.strokes)}
                className={`${box} ${on ? RADICAL_TILE_CLASS.chosen : RADICAL_TILE_CLASS.rest}`}
              >
                {glyph}
              </Link>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
