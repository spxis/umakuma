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
 * **A tile that would return nothing is never a link.** It is dimmed and
 * says why, and it stays where it is: a grid that reflows under the cursor
 * on every pick is a grid a reader cannot learn. What a page may leave out
 * altogether is a different, fixed set - on a stroke page, the radicals no
 * kanji at that count is built from at all. John: "there is no point showing
 * the disabled radicals that can never be clicked for that stroke count" and
 * then, when the first cut removed tiles on every click, "just remove the
 * unused radicals from the top level, not for each click - otherwise the
 * radicals menu moves". So `available` is decided once per page and
 * `usable` moves with the picks; the grid only draws the answer.
 *
 * One run rather than a block per stroke count, with the count as a marker:
 * a block each wasted most of its width on the counts holding three radicals
 * and made the grid four screens tall. This is how the paper dictionaries
 * print it, and how the picker in search has always drawn it.
 */
/**
 * The groups as they will be drawn: every radical, or only the page's own
 * fixed set, with a stroke count dropped when nothing of it is left. A
 * chosen radical is always drawn, so it can be un-chosen.
 */
export function visibleGroups(
  groups: readonly RadicalGroup[],
  chosen: readonly string[],
  available: ReadonlySet<string> | null,
): RadicalGroup[] {
  if (available === null) return [...groups];
  return groups.flatMap((group) => {
    const radicals = group.radicals.filter((radical) => chosen.includes(radical) || available.has(radical));
    return radicals.length === 0 ? [] : [{ ...group, radicals }];
  });
}

export default function RadicalPartsGrid({
  groups,
  chosen,
  usable,
  names,
  hrefFor,
  available = null,
  className = "",
}: {
  /** Every radical there is, in stroke order. */
  groups: RadicalGroup[];
  chosen: string[];
  /** What can still narrow what is left. Everything else is drawn as a dead end. */
  usable: ReadonlySet<string>;
  /** The English name for each radical, where one is known. */
  names: Record<string, string>;
  /** Where picking one leads, given the parts that would be chosen after it. */
  hrefFor: (parts: string[]) => string;
  /**
   * The page's own fixed set of radicals, decided once and not by the picks;
   * the rest are left out, along with any stroke count left empty. Null
   * draws every radical there is.
   */
  available?: ReadonlySet<string> | null;
  className?: string;
}) {
  /* The same cell and marker sizes the picker draws, so the two match. */
  const { cell, marker } = RADICAL_GRID_CLASSES[RADICAL_GRID_DEFAULT];
  const shown = visibleGroups(groups, chosen, available);

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {shown.map((group) => (
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
