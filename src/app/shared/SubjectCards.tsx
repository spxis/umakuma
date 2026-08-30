import type { ReactNode } from "react";

import {
  SUBJECT_VIEW_COPY,
  subjectTypeOrVocabulary,
  type SubjectListRow,
} from "@/app/shared/subjectListView";
import {
  glyphTextSizeClass,
  subjectTypePillClass,
  typeGlyphBoxClass,
} from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { SUBJECT_TYPE_DISPLAY } from "@/lib/domainConstants";

type Props<TRow extends SubjectListRow> = {
  rows: TRow[];
  onSelect: (row: TRow, index: number) => void;
  /** Floats over the card's top-right. The lists put their remove button here. */
  renderCorner?: (row: TRow) => ReactNode;
  /** Floats over the card's top-left. History puts the result mark here. */
  renderBadge?: (row: TRow) => ReactNode;
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
}: Props<TRow>) {
  if (rows.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {rows.map((row, index) => {
        const subjectType = subjectTypeOrVocabulary(row.subjectType);
        return (
          <li key={row.key} className="relative min-w-0">
            <button
              type="button"
              onClick={() => onSelect(row, index)}
              className={`flex h-full w-full min-w-0 cursor-pointer flex-col items-center gap-1 rounded-2xl border p-3 text-center transition hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${typeGlyphBoxClass(subjectType)}`}
            >
              <span className={`font-black leading-none [font-family:var(--font-jp-current)] ${glyphTextSizeClass(row.glyph)}`}>
                {row.glyph}
              </span>
              <span className="line-clamp-2 text-xs font-bold text-foreground/75">
                {row.meaning || SUBJECT_VIEW_COPY.noMeaning}
              </span>
              <span className="mt-auto flex flex-wrap items-center justify-center gap-1 pt-1">
                <span className={subjectTypePillClass(subjectType)}>
                  {SUBJECT_TYPE_DISPLAY[subjectType].short}
                </span>
                {row.wkLevel !== null ? (
                  <span className="subject-pill border-line bg-surface text-foreground">L{row.wkLevel}</span>
                ) : null}
              </span>
            </button>

            {renderBadge ? <div className="absolute left-1.5 top-1.5">{renderBadge(row)}</div> : null}
            {renderCorner ? <div className="absolute right-1.5 top-1.5">{renderCorner(row)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
