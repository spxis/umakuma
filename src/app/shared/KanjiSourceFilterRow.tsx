"use client";

import Link from "next/link";

import {
  KANJI_SOURCE_DISPLAY,
  KANJI_SOURCE_VALUES,
  toggleSource,
  type KanjiSource,
} from "@/lib/kanjiSourceFilters";

/**
 * "Only the ones I need to know", as a row of chips.
 *
 * John, on a stroke count holding 226 kanji: "it should probably also have a
 * filter for JLPT Only, WK only, UK only, Grade School Only... useful for
 * someone browsing all kanji and wanting to get rid of things they don't need
 * to recognize/know."
 *
 * Both browsers draw this one row, because they are the same question over
 * two different pools - and a filter that meant one thing on the stroke pages
 * and another on the radicals page would be worse than not having it.
 *
 * Every chip carries what it would leave, counted against the other filters
 * rather than against the whole set: the same promise the parts grid and the
 * stroke chips make. A chip that would leave nothing is drawn as spent rather
 * than removed, so the row does not change shape as a reader works through it.
 */
export default function KanjiSourceFilterRow({
  chosen,
  counts,
  hrefFor,
  className = "",
}: {
  chosen: KanjiSource[];
  /** What each filter would leave, with the others still applied. */
  counts: Record<KanjiSource, number>;
  hrefFor: (sources: KanjiSource[]) => string;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {KANJI_SOURCE_VALUES.map((source) => {
        const on = chosen.includes(source);
        const count = counts[source] ?? 0;
        const display = KANJI_SOURCE_DISPLAY[source];
        const spent = !on && count === 0;
        const chip = `inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${
          on
            ? "border-accent bg-accent text-white"
            : "border-line bg-surface text-foreground/60 hover:bg-surface-muted hover:text-foreground"
        }`;

        const body = (
          <>
            {display.label}
            <span className={`text-[10px] font-semibold ${on ? "text-white/80" : "text-foreground/60"}`}>
              {count}
            </span>
          </>
        );

        /* Nothing behind it, so it is not a link - the same rule the parts
           grid follows for a dead end. */
        return (
          <li key={source}>
            {spent ? (
              <span title={display.title} className={`${chip} cursor-not-allowed opacity-40`}>
                {body}
              </span>
            ) : (
              <Link
                href={hrefFor(toggleSource(chosen, source))}
                aria-pressed={on}
                title={display.title}
                className={chip}
              >
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
