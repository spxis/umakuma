"use client";

import type { ReactNode } from "react";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import { noTranslateClass } from "@/app/shared/japaneseText";

import { SUBJECT_LIST_ROW } from "@/app/shared/subjectListView";

import { ExplorerCardDensityProvider } from "./explorerCardDensity";

type Props = {
  onClick: (meta?: { shiftKey: boolean }) => void;
  activateOn?: "card" | "glyph-box";
  className: string;
  indexLabel: ReactNode;
  topRight: ReactNode;
  glyphClassName: string;
  dataSubjectId?: number; // Added optional dataSubjectId
  glyphText: string;
  glyphTextClassName: string;
  glyphSubtitle?: ReactNode;
  glyphOverlay?: ReactNode;
  statusChip: ReactNode;
  middleChip?: ReactNode;
  rightChip: ReactNode;
  /**
   * Cards for browsing, rows for scanning a long level at a glance.
   *
   * Both explorers draw through this component, so the row layout lives here
   * once rather than being rebuilt per surface - which is how the grade grid
   * ended up with its own and the other two with none.
   */
  density?: "grid" | "list";
  /**
   * A strip along the foot of the card - the filing marks, in practice.
   *
   * A sibling of the glyph button rather than anything inside it: the card is
   * a plain container holding one button and its overlay controls, and a
   * control inside the button is what `nested-interactive` fails on. Absent
   * unless a surface passes one, so a card that files nothing is unchanged.
   */
  footer?: ReactNode;
  /**
   * Picked, while the surface is in choosing mode.
   *
   * Drawn here rather than by each explorer so a chosen card reads the same
   * everywhere: a ring, and a tick where the index sits. The ring alone is a
   * fine signal on one card and a hard one to count across forty.
   */
  chosen?: boolean;
};

/**
 * One subject on an explorer: the glyph, what it means, and its chips.
 *
 * **The card is not a control.** It was one - `role="button"` with a tabIndex -
 * and it holds controls of its own: trouble, favourite, the bulk checkbox. A
 * control inside a control is `nested-interactive`, and it failed on 428 nodes
 * because every card counts. What it costs a member is concrete: a screen
 * reader announces the whole card as a single button and never reaches the
 * favourite inside it, and a keyboard reaches the card but not its contents.
 *
 * So the glyph is the button and the card is a plain container, which is the
 * shape `SubjectCards` already used. The overlay controls are siblings of the
 * button rather than children, positioned over the same box, so nothing moves
 * on screen while everything inside becomes reachable on its own.
 *
 * With `activateOn="card"` the container still takes a click, because a whole
 * card that responds to the mouse is worth keeping. That handler is an
 * enhancement and not the only way in - the glyph button is the keyboard and
 * screen-reader path - which is why the container needs no role of its own.
 */
export default function UnifiedExplorerCard({
  onClick,
  activateOn = "card",
  className,
  indexLabel,
  topRight,
  glyphClassName,
  dataSubjectId, // Destructured dataSubjectId
  glyphText,
  glyphTextClassName,
  glyphSubtitle,
  glyphOverlay,
  statusChip,
  middleChip,
  rightChip,
  density = "grid",
  chosen = false,
  footer,
}: Props) {
  const rows = density === "list";
  const { fontFamily } = useGlyphFontPreference();
  /*
   * The tick takes the index's place rather than a corner of its own. Every
   * corner is already spoken for - the JLPT and grade pills at the top right,
   * the level and success rate inside the glyph box, trouble and favourite at
   * its foot - and a tick laid over any of them covers something the member
   * is using to choose. The index is the one thing on the card that says
   * nothing about the character, and while choosing, which ones are chosen
   * matters more than what number they were.
   */
  const indexOrTick = chosen ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-black leading-none text-white">
      ✓
    </span>
  ) : (
    indexLabel
  );

  const focusRingClass =
    "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

  /*
   * Only the mouse convenience. The click that matters lives on the glyph
   * button, so this bails whenever the event came from any control inside the
   * card - the button included, which is what stops one click counting twice.
   */
  const cardClick =
    activateOn === "card"
      ? (event: React.MouseEvent<HTMLDivElement>) => {
          const target = event.target;
          if (target instanceof HTMLElement) {
            const interactive = target.closest(
              "button, input, select, textarea, a, [role='button'], [role='checkbox'], [role='switch']",
            );
            if (interactive && interactive !== event.currentTarget) {
              return;
            }
          }
          onClick({ shiftKey: event.shiftKey });
        }
      : undefined;

  const activate = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick({ shiftKey: event.shiftKey });
  };

  return (
    <ExplorerCardDensityProvider density={density}>
      <div
        onClick={cardClick}
        /*
         * The repo's own hook for a plain element that answers a click: it
         * carries the pointer cursor and the text-selection suppression the
         * card used to get for free from `[role="button"]`.
         */
        data-clickable={cardClick ? "true" : undefined}
        data-explorer-card-subject-id={dataSubjectId} // Added data-explorer-card-subject-id attribute
        /*
         * In rows the caller's box is dropped for the shared row chrome.
         *
         * Every explorer passed a `rounded-2xl border ... p-3` card class and
         * used it in both densities, so a list came out as forty bordered boxes
         * stacked with gaps - each one its own edge to stop at, and no two rows
         * lining up. A list is one surface with hairlines between its rows; the
         * container draws it, and a row draws nothing. The card class still
         * applies in the grid, which is where a box is the right answer.
         */
        className={`group/explorer-card relative ${rows ? SUBJECT_LIST_ROW : className} ${
          chosen ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""
        }`}
      >
        {rows ? (
          /* One line: index, glyph, what it means, then the chips at the end. */
          <div className="flex min-w-0 items-center gap-3">
            <span
              translate="no"
              className={noTranslateClass("w-8 shrink-0 text-[10px] font-semibold text-foreground/60")}
            >
              {indexOrTick}
            </span>
            <button
              type="button"
              data-explorer-glyph-hitbox="true"
              aria-pressed={chosen || undefined}
              onClick={activate}
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left ${focusRingClass}`}
            >
              <span
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${glyphClassName}`}
              >
                <span
                  lang="ja"
                  translate="no"
                  style={{ fontFamily }}
                  className={noTranslateClass("text-xl font-black leading-none")}
                >
                  {glyphText}
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground/75">
                {glyphSubtitle ?? ""}
              </span>
            </button>
            {/*
             * Beside the glyph, not inside it. The overlay is written for the
             * card's tall box and lays its pieces out in that box's corners;
             * a 44px square has no corners to spare, so in a row the same
             * pieces sit in the line as ordinary chips and buttons.
             */}
            <div className="flex shrink-0 items-center gap-1">{glyphOverlay}</div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{topRight}</div>
            <div className="flex shrink-0 items-center gap-2">
              {statusChip}
              {middleChip ?? null}
              {rightChip}
            </div>
          </div>
        ) : (
          <>
            <div className="flex min-h-[2.35rem] items-start justify-between gap-2">
              <span
                translate="no"
                className={noTranslateClass("text-[10px] font-semibold text-foreground/60")}
              >
                {indexOrTick}
              </span>
              <div className="flex min-h-[2.2rem] flex-wrap content-start items-start justify-end gap-1">
                {topRight}
              </div>
            </div>

            {/*
             * The wrapper is what the overlay positions against, so it has to
             * be exactly the button's box: the corners the level, the success
             * rate, trouble and favourite are placed in are this box's corners.
             */}
            <div className="relative mt-2">
              <button
                type="button"
                data-explorer-glyph-hitbox="true"
                aria-pressed={chosen || undefined}
                onClick={activate}
                className={`flex h-[8rem] w-full flex-col justify-center rounded-xl border px-3 py-2 ${focusRingClass} ${glyphClassName}`}
              >
                <span
                  lang="ja"
                  translate="no"
                  style={{ fontFamily }}
                  className={noTranslateClass(
                    `${glyphTextClassName} block text-center font-black leading-none`,
                  )}
                >
                  {glyphText}
                </span>
                <span className="mt-1 block min-h-[1.35rem] truncate whitespace-nowrap text-center text-base font-semibold text-foreground/70">
                  {glyphSubtitle ?? ""}
                </span>
              </button>
              {glyphOverlay}
            </div>

            <div className="mt-3 grid grid-cols-3 items-center gap-2">
              <span className="inline-flex items-center justify-self-start leading-none">
                {statusChip}
              </span>
              <span className="inline-flex items-center justify-self-center leading-none">
                {middleChip ?? <span />}
              </span>
              <span className="inline-flex items-center justify-self-end leading-none">
                {rightChip}
              </span>
            </div>
          </>
        )}
        {footer ? <div className="mt-2">{footer}</div> : null}
      </div>
    </ExplorerCardDensityProvider>
  );
}
