"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListRow } from "@/app/shared/ListSubjectRows";
import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import SubjectFilerToggle from "@/app/shared/SubjectFilerToggle";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import SurfacePagination from "@/app/shared/SurfacePagination";
import { SUBJECT_VIEW_MODES, SUBJECT_VIEW_MODE_VALUES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { useFilerOpen, useSubjectFiler } from "@/app/shared/useSubjectFiler";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import { LIST_ITEM_KINDS, SUBJECT_TYPES } from "@/lib/domainConstants";
import { strokesHref } from "@/lib/strokeAddress";
import type { StrokeCount, StrokeEntry } from "@/lib/strokeBrowser";
import type { ListSubjectRow } from "@/lib/studySubjectItems";

import { STROKE_BROWSER_COPY } from "./StrokeBrowser.constants";
import { srsBucketFromStage } from "@/lib/domainConstants";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import type { SubjectListRow } from "@/app/shared/subjectListView";
import SubjectCards from "@/app/shared/SubjectCards";

/**
 * Kanji by the number of strokes they take.
 *
 * The counts are links, so a stroke count is a page of its own that can be
 * shared and reloaded; only what is on the page - the density, whether the
 * uncommon ones are shown, the filing column - is held here.
 */
const VIEW_MODE_KEY = "wr:strokes:view-mode";

/**
 * A stroke entry as both list shapes want it.
 *
 * The rows go to the shared list, the cards to the shared grid, and the two
 * contracts differ only in the SRS fields - which a public page has none of,
 * because nobody is signed in to have progress on them.
 */
function toRow(entry: StrokeEntry): ListSubjectRow & SubjectListRow {
  return {
    key: `kanji:${entry.kanji}`,
    subjectId: 0,
    srsStage: null,
    srsBucket: srsBucketFromStage(null),
    kind: LIST_ITEM_KINDS.kanji,
    slug: null,
    glyph: entry.kanji,
    meanings: [entry.meaning],
    readings: entry.reading ? [entry.reading] : [],
    meaning: entry.meaning,
    reading: entry.reading,
    subjectType: SUBJECT_TYPES.kanji,
    wkLevel: null,
    href: `/kanji/${encodeURIComponent(entry.kanji)}`,
  };
}

export default function StrokeBrowserView({
  counts,
  strokes,
  entries,
  page,
  pageCount,
  commonOnly,
  shownTotal,
  total,
  accountId,
}: {
  counts: StrokeCount[];
  /** The count being read, or null on the index. */
  strokes: number | null;
  entries: StrokeEntry[];
  page: number;
  pageCount: number;
  commonOnly: boolean;
  /** How many the filter leaves, which is not how many fit on one page. */
  shownTotal: number;
  /** Every kanji at this count, before the common-only filter. */
  total: number;
  accountId: string | null;
}) {
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(VIEW_MODE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid),
  );
  const [filerOpen, setFilerOpen] = useFilerOpen();
  const rows = useMemo(() => entries.map(toRow), [entries]);
  const filing = Boolean(accountId) && filerOpen;
  const filer = useSubjectFiler(accountId, rows, filing);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{STROKE_BROWSER_COPY.heading}</h2>
        <p className="mb-2 text-xs text-foreground/60">{STROKE_BROWSER_COPY.blurb}</p>
        <ul className="flex flex-wrap gap-1.5">
          {counts.map((entry) => {
            const on = entry.strokes === strokes;
            return (
              <li key={entry.strokes}>
                <Link
                  href={strokesHref(entry.strokes)}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                    on ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/80 hover:bg-surface-muted"
                  }`}
                >
                  {entry.strokes}
                  <span className={`text-[10px] font-semibold ${on ? "text-white/80" : "text-foreground/60"}`}>{entry.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {strokes === null ? (
        <p className="rounded-2xl border border-line bg-surface-muted p-5 text-sm font-semibold text-foreground/70">
          {STROKE_BROWSER_COPY.pick}
        </p>
      ) : (
        <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              {strokes === 1 ? STROKE_BROWSER_COPY.countLabelOne : STROKE_BROWSER_COPY.countLabel(strokes)}
            </span>
            <span className="text-[11px] font-semibold text-foreground/60">
              {commonOnly ? STROKE_BROWSER_COPY.showingCommon(shownTotal, total) : STROKE_BROWSER_COPY.showingAll(total)}
            </span>
            <Link
              href={strokesHref(strokes, { commonOnly: !commonOnly })}
              aria-pressed={commonOnly}
              title={STROKE_BROWSER_COPY.commonHint}
              className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${
                commonOnly ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/60 hover:bg-surface-muted"
              }`}
            >
              {STROKE_BROWSER_COPY.commonOnly}
            </Link>
            <span className="ml-auto flex items-center gap-2">
              {accountId ? (
                <SubjectFilerToggle open={filerOpen} onToggle={() => setFilerOpen((was) => !was)} error={filing ? filer.error : null} />
              ) : null}
              <SubjectViewModeToggle
                value={viewMode}
                onChange={(next) => {
                  setViewMode(next);
                  setStoredEnum(VIEW_MODE_KEY, next);
                }}
              />
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-foreground/60">{STROKE_BROWSER_COPY.empty}</p>
          ) : viewMode === SUBJECT_VIEW_MODES.list ? (
            <ul className="mt-3 divide-y divide-line/60">
              {rows.map((row) => (
                <li key={row.key}>
                  <ListRow row={row} after={filing ? <SubjectFilerCell hit={row} filer={filer} className="basis-full pb-2 pl-3 md:basis-auto md:pb-0" /> : null} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <SubjectCards
                rows={rows}
                onSelect={() => undefined}
                gridClassName="gap-2 [grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]"
                hrefFor={(row) => row.href ?? null}
                renderDetail={(row) =>
                  row.reading ? (
                    <span lang="ja" translate="no" className={`text-[11px] font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}>
                      {row.reading}
                    </span>
                  ) : null
                }
                renderUnder={
                  filing
                    ? (row) => <SubjectFilerCell hit={row} filer={filer} className="mt-1 justify-center" />
                    : undefined
                }
              />
            </div>
          )}

          <SurfacePagination
            page={page}
            pageCount={pageCount}
            slot="bottom"
            placement="bottom"
            hrefFor={(next) => strokesHref(strokes, { commonOnly, page: next })}
          />
        </section>
      )}
    </div>
  );
}
