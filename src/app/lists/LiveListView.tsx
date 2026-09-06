"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import HideBurnedToggle from "@/app/shared/HideBurnedToggle";
import ListSearchField from "@/app/shared/ListSearchField";
import { ListCard, ListRow } from "@/app/shared/ListSubjectRows";
import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import SubjectFilerToggle from "@/app/shared/SubjectFilerToggle";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { SUBJECT_VIEW_MODES, SUBJECT_VIEW_MODE_VALUES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { useFilerOpen, useSubjectFiler } from "@/app/shared/useSubjectFiler";
import { useHideBurned } from "@/app/shared/useHideBurned";
import { withoutBurned } from "@/lib/burnList";
import { usePersistedEnum } from "@/lib/usePersistedEnum";
import { LIST_ITEM_KIND_DISPLAY, type ListItemKind } from "@/lib/domainConstants";
import { LIVE_LISTS_HREF } from "@/lib/liveLists";
import { subjectMatchesQuery } from "@/lib/subjectSearch";

import type { LiveListViewProps } from "./LiveList.types";
import LiveListActions from "./LiveListActions";

/**
 * A list nobody owns, read the way any other list is read.
 *
 * The same rows, kinds, search and burned filter a member's list gets - the
 * difference is what the page says about it: it is kept by the site rather
 * than by a person, it changes when the data does, and the two ways to keep
 * it are follow and copy.
 */
const VIEW_MODE_KEY = "wr:list-page:view-mode";
const ALL = "all";

export default function LiveListView({ live, rows, viewer, burnedIds }: LiveListViewProps) {
  const [kind, setKind] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = usePersistedEnum<SubjectViewMode>(VIEW_MODE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid);
  const [filerOpen, setFilerOpen] = useFilerOpen();
  const [hideBurned] = useHideBurned();

  const filing = Boolean(viewer.accountId) && filerOpen;
  const filer = useSubjectFiler(viewer.accountId, rows, filing);
  const burned = useMemo(() => new Set(burnedIds), [burnedIds]);
  const burnedInView = useMemo(() => withoutBurned(rows, burned).hidden, [burned, rows]);

  const kinds = useMemo(() => {
    const counts = new Map<ListItemKind, number>();
    for (const row of rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
    return [...counts.entries()];
  }, [rows]);

  const visible = useMemo(
    () =>
      (hideBurned ? withoutBurned(rows, burned).kept : rows)
        .filter((row) => kind === ALL || row.kind === kind)
        .filter((row) => subjectMatchesQuery(search, { glyph: row.glyph, meanings: [row.meaning], readings: [row.reading] })),
    [burned, hideBurned, kind, rows, search],
  );

  const CHIP =
    "inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-black uppercase tracking-[0.08em] transition";
  const chipClass = (on: boolean) =>
    `${CHIP} ${on ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"}`;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              <Link href={LIVE_LISTS_HREF} className="hover:text-accent">
                {STUDY_LIST_COPY.allLiveLists}
              </Link>
            </p>
            <h1 className="mt-1 text-2xl font-black text-foreground sm:text-3xl">{live.name}</h1>
            <p className="mt-1 text-sm font-semibold text-foreground/75">{live.description}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-foreground/60">
              <span className="subject-pill border-accent/30 bg-accent/10 text-accent">{STUDY_LIST_COPY.liveListPill}</span>
              <span>
                {live.itemCount} {live.itemCount === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
              </span>
              <span>{STUDY_LIST_COPY.liveListBlurb}</span>
            </p>
          </div>
          {viewer.accountId && viewer.key ? (
            <LiveListActions
              liveKey={live.key}
              viewerAccountId={viewer.accountId}
              viewerKey={viewer.key}
              following={viewer.following}
            />
          ) : null}
        </div>
      </header>

      {!viewer.signedIn ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div>
            <p className="text-sm font-black text-foreground">{STUDY_LIST_COPY.keepHeading}</p>
            <p className="text-xs font-semibold text-foreground/70">{STUDY_LIST_COPY.keepBody}</p>
          </div>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`${LIVE_LISTS_HREF}/${live.key}`)}`}
            className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-[11px] font-black uppercase tracking-[0.1em] text-white transition hover:brightness-110"
          >
            {STUDY_LIST_COPY.keepAction}
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {kinds.length > 1 ? (
            <>
              <button type="button" aria-pressed={kind === ALL} onClick={() => setKind(ALL)} className={chipClass(kind === ALL)}>
                {STUDY_LIST_COPY.allKinds} · {rows.length}
              </button>
              {kinds.map(([value, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                  className={chipClass(kind === value)}
                >
                  {LIST_ITEM_KIND_DISPLAY[value].plural} · {count}
                </button>
              ))}
            </>
          ) : null}
          <ListSearchField
            value={search}
            onChange={setSearch}
            label={STUDY_LIST_COPY.searchItems}
            options={rows.map((row) => ({ value: row.glyph, label: row.meaning }))}
          />
          {viewer.accountId ? <HideBurnedToggle hidden={hideBurned ? burnedInView : 0} burnedInView={burnedInView} /> : null}
          {viewer.accountId ? (
            <SubjectFilerToggle open={filerOpen} onToggle={() => setFilerOpen((was) => !was)} error={filing ? filer.error : null} />
          ) : null}
          <SubjectViewModeToggle
            value={viewMode}
            onChange={setViewMode}
          />
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-foreground/60">
            {rows.length === 0 ? STUDY_LIST_COPY.emptyPublic : STUDY_LIST_COPY.noListsMatch}
          </p>
        ) : viewMode === SUBJECT_VIEW_MODES.list ? (
          <ul className="mt-3 divide-y divide-line/60">
            {visible.map((row) => (
              <li key={row.key}>
                <ListRow
                  row={row}
                  after={filing ? <SubjectFilerCell hit={row} filer={filer} className="basis-full pb-2 pl-3 md:basis-auto md:pb-0" /> : null}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]">
            {visible.map((row) => (
              <li key={row.key}>
                <ListCard
                  row={row}
                  after={filing ? <SubjectFilerCell hit={row} filer={filer} className="mt-1 justify-center" /> : null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
