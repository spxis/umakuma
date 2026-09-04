"use client";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import type { LadderRow } from "@/lib/ladder/ladderCrosswalk";
import type { LadderLevelGroup } from "@/lib/ladder/ladderQuery";

import { ADMIN_LADDER_COPY as copy } from "./AdminLadder.constants";

/**
 * The ladder read a level at a time.
 *
 * The table answers "where is this kanji". This answers the question anybody
 * judging the curriculum actually asks — what does a level ask of somebody —
 * and it answers it by showing the level rather than counting it. Radicals in
 * cyan, then that level's kanji at reading size, then its words underneath, in
 * the order a level is met.
 *
 * The running totals on the right are the ones that matter to a learner: how
 * many kanji they know by the end of this level, not how many this level
 * added.
 */
export default function AdminLadderLevels({ groups }: { groups: LadderLevelGroup[] }) {
  return (
    <ol className="space-y-2">
      {groups.map((group) => (
        <li key={group.level} className="rounded-xl border border-line bg-surface px-3 py-2.5">
          <div className="flex gap-3">
            <div className="w-7 shrink-0 pt-0.5">
              <span className="font-mono text-sm font-black tabular-nums text-foreground/70">{group.level}</span>
              {group.nLevel !== null ? (
                <span className="mt-0.5 block text-[9px] font-black text-foreground/60">N{group.nLevel}</span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {group.radicals.length > 0 ? (
                <p {...japaneseTextProps("text-sm leading-relaxed text-cyan-700")}>
                  {group.radicals.map((row) => row.characters).join(" ")}
                </p>
              ) : null}

              {group.kanji.length > 0 ? (
                <p {...japaneseTextProps("text-xl font-black leading-snug tracking-wide text-foreground")}>
                  {group.kanji.map((row) => row.characters).join("")}
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-foreground/60">{copy.levels.noKanji}</p>
              )}

              {group.vocabulary.length > 0 ? (
                <p {...japaneseTextProps("text-[11px] leading-relaxed text-foreground/70")}>
                  {group.vocabulary.map((row) => row.characters).join("　")}
                </p>
              ) : null}
            </div>

            <div className="w-16 shrink-0 text-right">
              <p className="font-mono text-sm font-black tabular-nums text-foreground">{group.kanji.length}</p>
              <p className="font-mono text-[11px] font-bold tabular-nums text-purple-600">+{group.vocabulary.length}</p>
              <p className="mt-0.5 font-mono text-[10px] tabular-nums text-foreground/60">
                {group.kanjiThrough.toLocaleString("en-CA")} {copy.levels.known}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Exported for the test: what a level draws, without the markup around it. */
export function levelSummary(group: LadderLevelGroup): {
  radicals: number;
  kanji: number;
  vocabulary: number;
  kanjiThrough: number;
} {
  const count = (rows: LadderRow[]) => rows.length;
  return {
    radicals: count(group.radicals),
    kanji: count(group.kanji),
    vocabulary: count(group.vocabulary),
    kanjiThrough: group.kanjiThrough,
  };
}
