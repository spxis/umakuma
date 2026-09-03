import Link from "next/link";
import type { ReactNode } from "react";

import {
  SUBJECT_VIEW_COPY,
  subjectTypeOrVocabulary,
  type SubjectListRow,
} from "@/app/shared/subjectListView";
import {
  subjectTypePillClass,
  typeGlyphBoxClass,
} from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { SUBJECT_TYPE_DISPLAY } from "@/lib/domainConstants";
import { JP_TEXT_CLASS } from "./japaneseText";
import { glyphTextSizeClass } from "./glyphSizes";
import type { SubjectSelection } from "./useSubjectSelection";

type Props<TRow extends SubjectListRow> = {
  rows: TRow[];
  onSelect: (row: TRow, index: number) => void;
  /** Floats over the card's bottom-right. The lists put their remove button here. */
  renderCorner?: (row: TRow) => ReactNode;
  /** Floats over the card's top-left. History puts the result mark here. */
  renderBadge?: (row: TRow) => ReactNode;
  /**
   * Under the card rather than over it, and outside the button.
   *
   * A note is prose - it wraps, and it must not be laid over the glyph the
   * card exists to show. Being a sibling of the button also keeps a control
   * placed here from sitting inside another control.
   */
  renderUnder?: (row: TRow) => ReactNode;
  /**
   * Inside the card under the meaning, where a surface shows a reading.
   *
   * The grade explorer is built on readings - hiding them is what turns the
   * grid into a self-test - and the stroke browser shows them too. Passing the
   * line in keeps one card shape while letting each page say what belongs on
   * it, which is what the three of them were each drawing a whole card to get.
   */
  renderDetail?: (row: TRow) => ReactNode;
  /** Extra pills beside the type pill: a stroke count, a JLPT cross-reference. */
  renderPills?: (row: TRow) => ReactNode;
  /**
   * Where the card goes, for a surface whose card navigates.
   *
   * The explorers open a panel over the page, so their card is a button. The
   * stroke and grade browsers go to the character's own page, and a button
   * there costs what a link gives free: middle-click, open in a new tab, the
   * address on hover. Same card either way, only the element differs. While
   * choosing every card is a button, because the click picks rather than opens.
   */
  hrefFor?: (row: TRow) => string | null;
  /**
   * How densely the cards sit, where a surface has a reason to differ.
   *
   * The card is the same everywhere; how many fit on a row is not the same
   * question. An explorer shows a level, a status and a percentage on each
   * card and wants room for them; the stroke browser shows a glyph and a
   * reading and is read by sweeping two hundred of them, so it packs tighter.
   * Default is the explorers'.
   */
  gridClassName?: string;
  /**
   * Choosing, when the surface offers it. Shift takes everything between the
   * last pick and this one, and the card's click picks rather than opens.
   */
  selection?: SubjectSelection;
};

/**
 * The browsing half of the grid/list pair: big glyphs, a few per row.
 *
 * Where the row list is for finding a known item, this is for looking over what
 * is there — the glyph is the whole point, so it gets the space, and the meaning
 * and pills sit under it. Both halves take the same rows from the same sources,
 * so switching view never changes what is on screen, only how densely.
 */
export default function SubjectCards<TRow extends SubjectListRow>({
  rows,
  onSelect,
  renderCorner,
  renderBadge,
  renderUnder,
  renderDetail,
  renderPills,
  hrefFor,
  gridClassName = "grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4",
  selection,
}: Props<TRow>) {
  if (rows.length === 0) return null;

  const choosing = Boolean(selection?.choosing);
  const order = rows.map((row) => row.glyph);
  const pick = (row: TRow, shiftKey: boolean) => {
    if (!selection) return;
    if (shiftKey) selection.extendTo(row.glyph, order);
    else selection.toggle(row.glyph);
  };

  return (
    <ul className={`grid ${gridClassName}`}>
      {rows.map((row, index) => {
        const subjectType = subjectTypeOrVocabulary(row.subjectType);
        const chosen = choosing && Boolean(selection?.chosen.has(row.glyph));
        const shell = `flex h-full w-full min-w-0 cursor-pointer flex-col items-center gap-1 rounded-2xl border p-3 text-center transition hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${typeGlyphBoxClass(subjectType)} ${
          chosen ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""
        }`;
        const href = choosing ? null : (hrefFor?.(row) ?? null);
        const body = (
          <>
            <span className={`font-black leading-none ${JP_TEXT_CLASS} ${glyphTextSizeClass(row.glyph)}`}>
              {row.glyph}
            </span>
            <span className="line-clamp-2 text-xs font-bold text-foreground/75">
              {row.meaning || SUBJECT_VIEW_COPY.noMeaning}
            </span>
            {renderDetail ? renderDetail(row) : null}
            <span className="mt-auto flex flex-wrap items-center justify-center gap-1 pt-1">
              <span className={subjectTypePillClass(subjectType)}>
                {SUBJECT_TYPE_DISPLAY[subjectType].short}
              </span>
              {renderPills ? renderPills(row) : null}
            </span>
          </>
        );

        return (
          <li key={row.key} className="group relative min-w-0">
            {href ? (
              <Link href={href} className={shell}>
                {body}
              </Link>
            ) : (
              <button
                type="button"
                aria-pressed={choosing ? chosen : undefined}
                onClick={(event) => (choosing ? pick(row, event.shiftKey) : onSelect(row, index))}
                className={shell}
              >
                {body}
              </button>
            )}

            {/*
             * Level top right, as every other subject surface writes it. It
             * used to sit in the pill row under the glyph while a remove button
             * took this corner, so the same card read differently here than in
             * the explorers.
             */}
            {row.wkLevel !== null ? (
              <span className="subject-pill pointer-events-none absolute right-1.5 top-1.5 border-line bg-surface text-foreground">
                L{row.wkLevel}
              </span>
            ) : null}
            {/* The tick takes the badge corner while choosing: the level pill
              * owns the other one, and a tick laid over it hides the thing the
              * member is scanning. */}
            {choosing ? (
              <span
                aria-hidden="true"
                className={`absolute left-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-black leading-none ${
                  chosen ? "border-accent bg-accent text-white" : "border-line bg-surface/85 text-transparent"
                }`}
              >
                ✓
              </span>
            ) : renderBadge ? (
              <div className="absolute left-1.5 top-1.5">{renderBadge(row)}</div>
            ) : null}
            {renderCorner ? <div className="absolute bottom-1.5 right-1.5">{renderCorner(row)}</div> : null}
            {renderUnder ? renderUnder(row) : null}
          </li>
        );
      })}
    </ul>
  );
}
