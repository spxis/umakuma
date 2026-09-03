"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListRow } from "@/app/shared/ListSubjectRows";
import SubjectCards from "@/app/shared/SubjectCards";
import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import SubjectFilerToggle from "@/app/shared/SubjectFilerToggle";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { useFilerOpen, useSubjectFiler } from "@/app/shared/useSubjectFiler";
import { SUBJECT_VIEW_MODES, SUBJECT_VIEW_MODE_VALUES, type SubjectListRow, type SubjectViewMode } from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import type { FilerHit } from "@/lib/subjectFiler";
import { LIST_ITEM_KINDS, SUBJECT_TYPES, srsBucketFromStage } from "@/lib/domainConstants";
import { radicalsHref, togglePart } from "@/lib/radicalBrowser";
import type { RadicalGroup } from "@/lib/radicalSearch";
import type { RadicalMatch } from "@/lib/radicalSearchServer";

import { RADICAL_BROWSER_COPY } from "./RadicalBrowser.constants";

const VIEW_MODE_KEY = "wr:radicals:view-mode";

/**
 * The radicals, laid out the way the stroke browser lays out kanji.
 *
 * Same shape on purpose: a row of stroke counts to narrow by, then the things
 * themselves, then the filing column for a member who wants one on a list.
 * A learner who has used one of these pages has used both.
 *
 * The one addition is that a radical is also a question - pick it and the
 * page answers with the kanji built from it - so choosing is a link like the
 * stroke counts are, and the whole state is in the address.
 */

/** A matched kanji as the shared grid wants it. */
function toRow(match: RadicalMatch): SubjectListRow & FilerHit & { href: string; reading: string | null } {
  return {
    key: `kanji:${match.kanji}`,
    /*
     * Zero, not a real id: the dictionary is what knows these characters, and
     * `catalogId` reads any non-positive value as "no catalogue id" - so the
     * filing column offers lists (which name a kanji by its character) and
     * not the tags, which need a WaniKani subject to hang off.
     */
    subjectId: 0,
    slug: null,
    srsStage: null,
    srsBucket: srsBucketFromStage(null),
    glyph: match.kanji,
    meaning: match.meaning,
    reading: null,
    subjectType: SUBJECT_TYPES.kanji,
    wkLevel: null,
    href: `/kanji/${encodeURIComponent(match.kanji)}`,
  };
}

export default function RadicalBrowserView({
  groups,
  shown,
  chosen,
  usable,
  matches,
  totalMatches,
  names,
  accountId,
}: {
  groups: RadicalGroup[];
  /** Every radical there is; the page never shows a subset. */
  shown: number;
  chosen: string[];
  /** Radicals that can still narrow; everything else is a dead end. */
  usable: string[];
  matches: RadicalMatch[];
  totalMatches: number;
  /** The English name for each radical, where one is known. */
  names: Record<string, string>;
  accountId: string | null;
}) {
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(VIEW_MODE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid),
  );
  const [filerOpen, setFilerOpen] = useFilerOpen();
  const rows = useMemo(() => matches.map(toRow), [matches]);
  const filing = Boolean(accountId) && filerOpen;
  const filer = useSubjectFiler(accountId, rows, filing);
  const usableSet = useMemo(() => new Set(usable), [usable]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            {RADICAL_BROWSER_COPY.title}
          </span>
          <span className="text-[11px] font-semibold text-foreground/60">
            {shown === 1 ? RADICAL_BROWSER_COPY.showingOne : RADICAL_BROWSER_COPY.showing(shown)}
          </span>
          {chosen.length > 0 ? (
            <Link
              href={radicalsHref()}
              className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60 transition hover:bg-surface-muted"
            >
              {RADICAL_BROWSER_COPY.clear}
            </Link>
          ) : null}
        </div>

        <div className="mt-3 space-y-3">
          {groups.map((group) => (
            <div key={group.strokes} className="flex flex-wrap items-start gap-1.5">
              {/* The count leads the row, the way the picker in search does it. */}
              <span className="mt-1 w-6 shrink-0 text-[11px] font-black text-foreground/60">{group.strokes}</span>
              {group.radicals.map((radical) => {
                const on = chosen.includes(radical);
                /*
                 * Dimmed rather than removed. A radical that cannot narrow what
                 * is left is still a fact about the language, and taking it off
                 * the page would make the grid jump about as choices are made.
                 */
                const dead = chosen.length > 0 && !on && !usableSet.has(radical);
                const box = `inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-1.5 text-lg leading-none transition ${JP_TEXT_CLASS}`;
                const glyph = (
                  <span lang="ja" translate="no">
                    {radical}
                  </span>
                );

                /*
                 * A dead end is not a destination, so it is not a link. The
                 * dimming matches the picker in search, which had the same
                 * problem first: faint enough to read as unavailable, dark
                 * enough to still be a character somebody can look at.
                 */
                return dead ? (
                  <span
                    key={radical}
                    title={RADICAL_BROWSER_COPY.deadEnd}
                    className={`${box} cursor-not-allowed border-line/60 bg-surface-muted text-foreground/60 opacity-40`}
                  >
                    {glyph}
                  </span>
                ) : (
                  <Link
                    key={radical}
                    href={radicalsHref({ parts: togglePart(chosen, radical) })}
                    aria-pressed={on}
                    title={names[radical] ?? undefined}
                    className={`${box} ${
                      on ? "border-radical bg-radical text-white" : "border-line bg-surface text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {glyph}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {chosen.length > 0 ? (
        <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              {RADICAL_BROWSER_COPY.pickedHeading}
            </span>
            <span className="text-[11px] font-semibold text-foreground/60">
              {RADICAL_BROWSER_COPY.matches(rows.length, totalMatches)}
            </span>
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
            <p className="py-8 text-center text-sm font-semibold text-foreground/60">{RADICAL_BROWSER_COPY.noMatches}</p>
          ) : viewMode === SUBJECT_VIEW_MODES.list ? (
            <ul className="mt-3 divide-y divide-line/60">
              {rows.map((row) => (
                <li key={row.key}>
                  <ListRow
                    row={{ ...row, kind: LIST_ITEM_KINDS.kanji, meanings: [row.meaning], readings: [] }}
                    after={filing ? <SubjectFilerCell hit={row} filer={filer} className="basis-full pb-2 pl-3 md:basis-auto md:pb-0" /> : null}
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
                hrefFor={(row) => row.href}
                renderUnder={filing ? (row) => <SubjectFilerCell hit={row} filer={filer} className="mt-1 justify-center" /> : undefined}
              />
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-2xl border border-line bg-surface-muted p-5 text-sm font-semibold text-foreground/70">
          {RADICAL_BROWSER_COPY.pickHint}
        </p>
      )}
    </div>
  );
}
