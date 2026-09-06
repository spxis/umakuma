import Link from "next/link";

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
          return (
            <Link
              key={`group-${chip.startLevel}`}
              href={umakumaLevelHref(nickname, chip.startLevel)}
              title={copy.openGroup(chip.startLevel, chip.endLevel)}
              className={`${UK_LEVEL_CHIP.base} ${UK_LEVEL_CHIP.group}`}
            >
              {copy.levelGroup(chip.startLevel, chip.endLevel)}
            </Link>
          );
        }

        const summary = byLevel.get(chip.level);
        const isHere = chip.level === current;
        const tone = isHere
          ? UK_LEVEL_CHIP.here
          : summary?.completesJlpt != null
            ? UK_LEVEL_CHIP.milestone
            : UK_LEVEL_CHIP.idle;

        return (
          <Link
            key={chip.level}
            href={umakumaLevelHref(nickname, chip.level)}
            aria-current={isHere ? "page" : undefined}
            title={
              summary?.completesJlpt != null
                ? `${copy.levelHeading(chip.level)} — ${copy.jlptAt(summary.completesJlpt)}`
                : copy.levelHeading(chip.level)
            }
            className={`${UK_LEVEL_CHIP.base} ${tone}`}
          >
            {chip.level}
            {summary?.completesJlpt != null ? (
              <span className="ml-1 text-[9px] font-black uppercase tracking-[0.08em] opacity-80">
                {`N${summary.completesJlpt}`}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
