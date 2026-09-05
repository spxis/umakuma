"use client";

import Link from "next/link";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import type { LadderLevelSummary } from "@/lib/ladder/ladderQuery";

import UmakumaLadderSearch from "./UmakumaLadderSearch";
import { UK_EXPLORER_COPY as copy } from "./UmakumaExplorer.constants";
import { umakumaLevelHref } from "./umakumaAddress";

/**
 * The whole ladder, as a page of its own.
 *
 * `/umakuma` is the curriculum and `/umakuma/23` is a level of it, which is
 * what the address says either way. It could have redirected to a level - the
 * grades page does - but a redirect makes the collection a fiction: there is a
 * real thing to show at the top of a hundred levels, which is their shape.
 *
 * So: every level with what it holds, the JLPT bands marked where they finish,
 * and the reader's own level offered first.
 */
export default function UmakumaLadderIndex({
  nickname,
  levels,
  current,
}: {
  nickname: string;
  levels: LadderLevelSummary[];
  current: number;
}) {
  const totals = levels.reduce(
    (sum, level) => ({
      radicals: sum.radicals + level.radicals,
      kanji: sum.kanji + level.kanji,
      vocabulary: sum.vocabulary + level.vocabulary,
    }),
    { radicals: 0, kanji: 0, vocabulary: 0 },
  );

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-black text-foreground">{copy.browseHeading}</h2>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] tabular-nums text-foreground/60">
            {copy.levelTally(totals.radicals, totals.kanji, totals.vocabulary)}
          </p>
        </div>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.browseBlurb}</p>

        <UmakumaLadderSearch className="mt-3" />

        <Link
          href={umakumaLevelHref(nickname, current)}
          className="mt-3 inline-flex h-9 items-center rounded-full border border-accent bg-accent px-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:opacity-90"
        >
          {copy.yourLevel(current)}
        </Link>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-black text-foreground">
          {copy.allLevels(KANJI_LADDER_LEVELS)}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {levels.map((level) => (
            <li key={level.level}>
              <Link
                href={umakumaLevelHref(nickname, level.level)}
                aria-current={level.level === current ? "page" : undefined}
                className={`flex h-full flex-col rounded-xl border p-3 transition ${
                  level.level === current
                    ? "border-accent bg-accent/10"
                    : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-black tabular-nums text-foreground">
                    {copy.levelHeading(level.level)}
                  </span>
                  {level.nLevel !== null ? (
                    <span className="shrink-0 rounded-full border border-teal-300 bg-teal-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-teal-800">
                      {`N${level.nLevel}`}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground/60">
                  {copy.levelTally(level.radicals, level.kanji, level.vocabulary)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
