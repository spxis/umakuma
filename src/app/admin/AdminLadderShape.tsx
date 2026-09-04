"use client";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import type { LadderLevelSummary } from "@/lib/ladder/ladderQuery";

import { ADMIN_LADDER_COPY as copy } from "./AdminLadder.constants";

/**
 * The whole ladder as a hundred bars.
 *
 * The number that decides whether a level is fair is not its kanji count but
 * everything it asks at once — WaniKani's levels are overwhelming because they
 * are 35 kanji *and* 120 words. So each bar is stacked by kind, and a level
 * that has quietly grown heavy is visible from across the room rather than
 * findable by reading a table.
 */
export default function AdminLadderShape({
  levels,
  selected,
  onSelect,
}: {
  levels: LadderLevelSummary[];
  selected: number | null;
  onSelect: (level: number | null) => void;
}) {
  const tallest = Math.max(1, ...levels.map((level) => level.total));

  return (
    <section className="rounded-xl border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.shape}</h3>
        <p className="text-[11px] font-semibold text-foreground/60">{copy.shapeHint}</p>
      </div>

      <ol className="mt-3 flex items-end gap-px overflow-x-auto pb-1">
        {levels.map((level) => {
          const isSelected = selected === level.level;
          const height = (value: number) => `${Math.round((value / tallest) * 64)}px`;
          return (
            <li key={level.level} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : level.level)}
                title={`Level ${level.level} · ${level.radicals} radicals · ${level.kanji} kanji · ${level.vocabulary} words`}
                className={`flex w-2.5 flex-col justify-end rounded-sm transition hover:opacity-80 ${
                  isSelected ? "ring-2 ring-accent" : ""
                }`}
                style={{ height: "64px" }}
              >
                <span className="block w-full rounded-t-sm bg-purple-300" style={{ height: height(level.vocabulary) }} />
                <span className="block w-full bg-pink-400" style={{ height: height(level.kanji) }} />
                <span className="block w-full bg-sky-300" style={{ height: height(level.radicals) }} />
              </button>
            </li>
          );
        })}
      </ol>

      {/* The five points where a JLPT band is finished, which is the promise the ladder makes. */}
      <ol className="mt-1 flex gap-px overflow-x-auto text-[9px] font-black text-foreground/60">
        {levels.map((level) => (
          <li key={level.level} className="w-2.5 shrink-0 text-center">
            {level.level % 10 === 0 ? level.level : ""}
          </li>
        ))}
      </ol>

      <p className="mt-2 text-[11px] font-semibold text-foreground/60">
        {levels.length} levels of {KANJI_LADDER_LEVELS} ·{" "}
        {levels.reduce((sum, level) => sum + level.kanji, 0).toLocaleString("en-CA")} kanji ·{" "}
        {levels.reduce((sum, level) => sum + level.vocabulary, 0).toLocaleString("en-CA")} words
      </p>
    </section>
  );
}
