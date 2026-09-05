"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { LadderLevelSummary } from "@/lib/ladder/ladderQuery";

import { UK_EXPLORER_COPY as copy, UK_LEVEL_CHIP } from "./UmakumaExplorer.constants";
import { umakumaLevelHref } from "./umakumaAddress";

/**
 * The hundred levels, as one row you can point at.
 *
 * A chip per level rather than ten levels a page: the reader can see where
 * they are among the hundred, jump anywhere, and link to it. The row scrolls
 * rather than wrapping, for the reason the header does - a control that grows
 * a second line as the window narrows moves the page under the reader.
 *
 * Levels that finish a JLPT band are marked, because in a row of a hundred
 * they are the landmarks somebody navigates by.
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
  const here = useRef<HTMLAnchorElement>(null);

  /* Level 74 is off screen in a row of a hundred, and the one chip the reader
     needs to see is the one they are on. */
  useEffect(() => {
    here.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current]);

  return (
    <div
      role="navigation"
      aria-label={copy.levelLabel}
      className="admin-tab-scroll flex flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1"
    >
      {levels.map((level) => {
        const isHere = level.level === current;
        const tone = isHere
          ? UK_LEVEL_CHIP.here
          : level.nLevel !== null
            ? UK_LEVEL_CHIP.milestone
            : UK_LEVEL_CHIP.idle;

        return (
          <Link
            key={level.level}
            ref={isHere ? here : undefined}
            href={umakumaLevelHref(nickname, level.level)}
            aria-current={isHere ? "page" : undefined}
            title={
              level.nLevel !== null
                ? `${copy.levelHeading(level.level)} — ${copy.jlptAt(level.nLevel)}`
                : copy.levelHeading(level.level)
            }
            className={`${UK_LEVEL_CHIP.base} ${tone}`}
          >
            {level.level}
            {level.nLevel !== null ? (
              <span className="ml-1 text-[9px] font-black uppercase tracking-[0.08em] opacity-80">
                {`N${level.nLevel}`}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
