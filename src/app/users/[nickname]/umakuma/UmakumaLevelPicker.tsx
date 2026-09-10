import { FilterChipLink, filterChipGroupTone, filterChipTone } from "@/app/shared/FilterChip";
import { ladderLevelChips } from "@/lib/ladder/levelChips";
import type { LadderLevelSummary } from "@/lib/ladder/ladderQuery";

import { UK_EXPLORER_COPY as copy, UK_LEVEL_CHIP } from "./UmakumaExplorer.constants";
import { umakumaLevelHref } from "./umakumaAddress";

/**
 * The hundred levels, as a filter that wraps and opens a decade at a time.
 *
 * It was one row of a hundred chips that would not wrap, on the reasoning the
 * app header uses - a control that grows a second line moves the page under
 * the reader. That reasoning does not survive a hundred items: the row
 * scrolled sideways and showed levels 1 to 21, so the other seventy-nine were
 * behind a drag nobody makes. John, twice, and the second time with
 * screenshots: wrap it like the JLPT filter, and group in tens with a group
 * opening on a click, the way the WaniKani filter's range chips do.
 *
 * The open decade is the one holding the level being read, so pressing a shut
 * group is simply a link to its first level - the page comes back with that
 * decade open. No client state, which means the arrangement survives a reload
 * and can be linked to.
 *
 * Levels that finish a JLPT band stay marked: in a hundred they are the
 * landmarks somebody navigates by.
 *
 * **Every chip says how much is behind it**, drawn by `FilterChip` like every
 * other counted chip on the site. This row was the one that did not: the type
 * chips a line above it read `RADICALS (1) KANJI (25) VOCAB (76)` and the
 * levels under them were bare numbers, so the filter that decides how much you
 * are looking at was the only one that would not say. A decade carries its
 * ten levels added up, which is the number pressing it is worth - it is the
 * one chip whose count is not visible anywhere else on the page.
 */
export default function UmakumaLevelPicker({
  nickname,
  levels,
  current,
}: {
  nickname: string;
  levels: LadderLevelSummary[];
  current: number;
}) {
  const byLevel = new Map(levels.map((level) => [level.level, level]));
  const chips = ladderLevelChips(levels.length, current);

  return (
    <div
      role="navigation"
      aria-label={copy.levelLabel}
      className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface px-1.5 py-1"
    >
      <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">
        {copy.levelLabel}
      </span>

      {chips.map((chip) => {
        if (chip.kind === "group") {
          let total = 0;
          for (let level = chip.startLevel; level <= chip.endLevel; level += 1) {
            total += byLevel.get(level)?.total ?? 0;
          }

          return (
            <FilterChipLink
              key={`group-${chip.startLevel}`}
              href={umakumaLevelHref(nickname, chip.startLevel)}
              on={false}
              /* Amber, because a decade is a fold in the row rather than one of
                 the levels being chosen between. */
              toneClassName={filterChipGroupTone(false)}
              title={copy.openGroup(chip.startLevel, chip.endLevel)}
              label={copy.levelGroup(chip.startLevel, chip.endLevel)}
              count={total}
              className={UK_LEVEL_CHIP.figures}
            />
          );
        }

        const summary = byLevel.get(chip.level);
        const isHere = chip.level === current;
        const milestone = summary?.completesJlpt ?? null;

        return (
          <FilterChipLink
            key={chip.level}
            href={umakumaLevelHref(nickname, chip.level)}
            on={isHere}
            toneClassName={isHere || milestone === null ? filterChipTone(isHere) : UK_LEVEL_CHIP.milestone}
            title={levelTitle(chip.level, summary)}
            label={
              <>
                {chip.level}
                {milestone !== null ? (
                  <span className="ml-1 text-[9px] font-black uppercase tracking-[0.08em] opacity-80">
                    {`N${milestone}`}
                  </span>
                ) : null}
              </>
            }
            count={summary?.total ?? 0}
            className={UK_LEVEL_CHIP.figures}
          />
        );
      })}
    </div>
  );
}

/**
 * What a level holds, on hovering its chip.
 *
 * The chip has room for one number; the tally is the breakdown behind it, and
 * it is the same sentence the level's own heading prints, so the hover and the
 * page cannot end up saying different things.
 */
function levelTitle(level: number, summary: LadderLevelSummary | undefined): string {
  const parts = [copy.levelHeading(level)];
  if (summary) parts.push(copy.levelTally(summary.radicals, summary.kanji, summary.vocabulary));
  if (summary?.completesJlpt != null) parts.push(copy.jlptAt(summary.completesJlpt));
  return parts.join(" — ");
}
