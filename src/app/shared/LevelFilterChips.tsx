"use client";

import { useState } from "react";

import CompactFilterRow from "@/app/shared/CompactFilterRow";
import { FilterChipButton, filterChipGroupTone, filterChipTone } from "@/app/shared/FilterChip";
import { ladderLevelChips } from "@/lib/ladder/levelChips";

export const LEVEL_FILTER_COPY = {
  all: "All",
  openGroup: (start: number, end: number) => `Show levels ${start} to ${end}`,
  groupLabel: (start: number, end: number) => `${start}-${end}`,
} as const;

type Props = {
  /** What this row of levels is called, printed at its left. */
  label: string;
  /** The levels that have anything in them, ascending. Sparse is expected. */
  levels: number[];
  counts: Record<number, number>;
  allCount: number;
  selected: number | "all";
  onSelect: (value: number | "all") => void;
};

/**
 * A ladder of levels as a filter you can point at: decades, one of them open.
 *
 * History drew every level it had a row for, which on the UmaKuma ladder is
 * sixty-odd chips and thirteen lines on a phone - a wall you scroll past to
 * reach the thing you came for. John: "they should be grouped and take up a
 * maximum of two-3 lines", and "look at the other pages we already have solved
 * this issue and just reuse the code".
 *
 * The solved code is `ladderLevelChips`, written for the UmaKuma explorer's
 * hundred levels after John asked for it twice: fixed decades, any one of which
 * can be the open one, and pressing a shut decade opens it. This is that
 * arrangement as a filter rather than as navigation, which is the only real
 * difference - the explorer's picker is links, because its open decade follows
 * the page you are on and should survive a reload, while a filter's open decade
 * is a way of looking at the row and belongs to the row.
 *
 * A decade nothing landed in is dropped rather than drawn shut and empty, the
 * same rule the study explorer's level row follows: this view is only about the
 * attempts a member actually has.
 */
export default function LevelFilterChips({ label, levels, counts, allCount, selected, onSelect }: Props) {
  const [openStart, setOpenStart] = useState<number | null>(null);

  const highestLevel = levels[levels.length - 1] ?? 0;
  /*
   * The open decade is the selected level's, so choosing 27 and coming back
   * finds the twenties open. With nothing selected and nothing opened by hand,
   * -1 matches no decade and the row is all groups - which is the compact
   * shape this exists for.
   */
  const openLevel = typeof selected === "number" ? selected : (openStart ?? -1);
  const present = new Set(levels);
  const chips = ladderLevelChips(highestLevel, openLevel);

  return (
    <CompactFilterRow label={label}>
      {(chipClass) => (
        <>
      <FilterChipButton
        type="button"
        onClick={() => {
          setOpenStart(null);
          onSelect("all");
        }}
        className={chipClass(selected === "all")}
        toneClassName={filterChipTone(selected === "all")}
        label={LEVEL_FILTER_COPY.all}
        count={allCount}
      />
      {chips.map((chip) => {
        if (chip.kind === "group") {
          let total = 0;
          for (let level = chip.startLevel; level <= chip.endLevel; level += 1) {
            total += counts[level] ?? 0;
          }
          if (total === 0) {
            return null;
          }

          return (
            <FilterChipButton
              key={`group-${chip.startLevel}`}
              type="button"
              onClick={() => setOpenStart(chip.startLevel)}
              title={LEVEL_FILTER_COPY.openGroup(chip.startLevel, chip.endLevel)}
              aria-expanded={false}
              className={chipClass(false)}
              toneClassName={filterChipGroupTone(false)}
              label={LEVEL_FILTER_COPY.groupLabel(chip.startLevel, chip.endLevel)}
              count={total}
            />
          );
        }

        if (!present.has(chip.level)) {
          return null;
        }

        return (
          <FilterChipButton
            key={chip.level}
            type="button"
            onClick={() => onSelect(chip.level)}
            aria-pressed={selected === chip.level}
            className={chipClass(selected === chip.level)}
            toneClassName={filterChipTone(selected === chip.level)}
            label={String(chip.level)}
            count={counts[chip.level] ?? 0}
          />
        );
      })}
        </>
      )}
    </CompactFilterRow>
  );
}
