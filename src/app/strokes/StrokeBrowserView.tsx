"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ListRow } from "@/app/shared/ListSubjectRows";
import RadicalPartsGrid from "@/app/shared/RadicalPartsGrid";
import { RADICAL_PARTS_COPY } from "@/app/shared/radicalPartsCopy";
import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import SubjectFilerToggle from "@/app/shared/SubjectFilerToggle";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import SurfacePagination from "@/app/shared/SurfacePagination";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { useFilerOpen, useSubjectFiler } from "@/app/shared/useSubjectFiler";
import { usePersistedEnum } from "@/lib/usePersistedEnum";
import { LIST_ITEM_KINDS, SUBJECT_TYPES } from "@/lib/domainConstants";
import { strokesHref } from "@/lib/strokeAddress";
import KanjiSourceFilterRow from "@/app/shared/KanjiSourceFilterRow";
import type { KanjiSource } from "@/lib/kanjiSourceFilters";
import type { RadicalGroup } from "@/lib/radicalSearch";
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
  sources,
  sourceCounts,
  shownTotal,
  total,
  groups,
  chosenParts,
  usableParts,
  partNames,
  accountId,
}: {
  counts: StrokeCount[];
  /** The count being read. The index redirects to the first, so there is always one. */
  strokes: number;
  entries: StrokeEntry[];
  page: number;
  pageCount: number;
  /** Which lists the page has been narrowed to. */
  sources: KanjiSource[];
  /** What each of those filters would leave, with the others still applied. */
  sourceCounts: Record<KanjiSource, number>;
  /** How many the filter leaves, which is not how many fit on one page. */
  shownTotal: number;
  /** Every kanji at this count, before the common-only filter. */
  total: number;
  /** Every radical there is, for the second filter under the counts. */
  groups: RadicalGroup[];
  chosenParts: string[];
  /** The parts still present in what is on the page. The rest are dead ends. */
  usableParts: string[];
  partNames: Record<string, string>;
  accountId: string | null;
}) {
  const [viewMode, setViewMode] = usePersistedEnum<SubjectViewMode>(
    VIEW_MODE_KEY,
    SUBJECT_VIEW_MODE_VALUES,
    SUBJECT_VIEW_MODES.grid,
  );
  const [filerOpen, setFilerOpen] = useFilerOpen();
  const rows = useMemo(() => entries.map(toRow), [entries]);
  const filing = Boolean(accountId) && filerOpen;
  const filer = useSubjectFiler(accountId, rows, filing);
  const usableSet = useMemo(() => new Set(usableParts), [usableParts]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {STROKE_BROWSER_COPY.heading}
        </h2>
        <p className="mb-2 text-xs text-foreground/60">
          {STROKE_BROWSER_COPY.blurb}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {counts.map((entry) => {
            const on = entry.strokes === strokes;
            return (
              <li key={entry.strokes}>
                <Link
                  href={strokesHref(entry.strokes)}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                    on
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface text-foreground/80 hover:bg-surface-muted"
                  }`}
                >
                  {entry.strokes}
                  <span
                    className={`text-[10px] font-semibold ${on ? "text-white/80" : "text-foreground/60"}`}
                  >
                    {entry.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/*
          * The second filter, under the first one and inside the same card.
          *
          * Nine hundred kanji at one stroke count is a page to scroll rather
          * than a page to read, and the part somebody has in mind - a mouth,
          * a hand - is the way they would narrow it by hand. Everything
          * offered is measured against what is on the page, so nothing here
          * leads to an empty one.
          *
          * The counts above are deliberately untouched by it: they say how
          * many kanji each stroke count holds, which is a fact about the
          * ladder rather than about this page.
          */}
        <div className="mt-4 border-t border-line/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              {RADICAL_PARTS_COPY.partsHeading}
            </h3>
            <p className="text-xs text-foreground/60">{RADICAL_PARTS_COPY.partsBlurb}</p>
            {chosenParts.length > 0 ? (
              <Link
                href={strokesHref(strokes, { sources })}
                className="ml-auto inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60 transition hover:bg-surface-muted"
              >
                {RADICAL_PARTS_COPY.clear}
              </Link>
            ) : null}
          </div>
          <RadicalPartsGrid
            className="mt-2 max-h-[32vh] overflow-y-auto"
            groups={groups}
            chosen={chosenParts}
            usable={usableSet}
            names={partNames}
            hrefFor={(parts) => strokesHref(strokes, { sources, parts })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            {strokes === 1
              ? STROKE_BROWSER_COPY.countLabelOne
              : STROKE_BROWSER_COPY.countLabel(strokes)}
          </span>
          <span className="text-[11px] font-semibold text-foreground/60">
            {shownTotal === total
              ? STROKE_BROWSER_COPY.showingAll(total)
              : STROKE_BROWSER_COPY.showingParts(shownTotal, total)}
          </span>
          {/*
            * Five questions of the same kind, in one row. Common only was a
            * button of its own until John asked for the other four: "useful
            * for someone browsing all kanji and wanting to get rid of things
            * they don't need to recognize/know."
            */}
          <KanjiSourceFilterRow
            chosen={sources}
            counts={sourceCounts}
            hrefFor={(next) => strokesHref(strokes, { sources: next, parts: chosenParts })}
          />
          <span className="ml-auto flex items-center gap-2">
            {accountId ? (
              <SubjectFilerToggle
                open={filerOpen}
                onToggle={() => setFilerOpen((was) => !was)}
                error={filing ? filer.error : null}
              />
            ) : null}
            <SubjectViewModeToggle
              value={viewMode}
              onChange={(next) => {
                setViewMode(next);
              }}
            />
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-foreground/60">
            {STROKE_BROWSER_COPY.empty}
          </p>
        ) : viewMode === SUBJECT_VIEW_MODES.list ? (
          <ul className="mt-3 divide-y divide-line/60">
            {rows.map((row) => (
              <li key={row.key}>
                <ListRow
                  row={row}
                  after={
                    filing ? (
                      <SubjectFilerCell
                        hit={row}
                        filer={filer}
                        className="basis-full pb-2 pl-3 md:basis-auto md:pb-0"
                      />
                    ) : null
                  }
                />
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
                  <span
                    lang="ja"
                    translate="no"
                    className={`text-[11px] font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}
                  >
                    {row.reading}
                  </span>
                ) : null
              }
              renderUnder={
                filing
                  ? (row) => (
                      <SubjectFilerCell
                        hit={row}
                        filer={filer}
                        className="mt-1 justify-center"
                      />
                    )
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
          hrefFor={(next) => strokesHref(strokes, { sources, parts: chosenParts, page: next })}
        />
      </section>
    </div>
  );
}
