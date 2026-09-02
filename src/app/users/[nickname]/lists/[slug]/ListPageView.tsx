"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { SUBJECT_VIEW_MODES, SUBJECT_VIEW_MODE_VALUES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import { LIST_ITEM_KIND_DISPLAY, LIST_VISIBILITIES, LIST_VISIBILITY_DISPLAY, type ListItemKind } from "@/lib/domainConstants";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import HideBurnedToggle from "@/app/shared/HideBurnedToggle";
import ListSearchField from "@/app/shared/ListSearchField";
import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import { useHideBurned } from "@/app/shared/useHideBurned";
import { withoutBurned } from "@/lib/burnList";
import { subjectMatchesQuery } from "@/lib/subjectSearch";
import SubjectFilerToggle from "@/app/shared/SubjectFilerToggle";
import { useFilerOpen, useSubjectFiler } from "@/app/shared/useSubjectFiler";

import type { ListPageViewProps } from "./ListPage.types";
import ListContributeBox from "./ListContributeBox";
import { ListCard, ListRow, ProposeRemovalButton } from "@/app/shared/ListSubjectRows";
import ListProposalsPanel from "./ListProposalsPanel";
import ListShareControls from "./ListShareControls";
import ListViewerActions from "./ListViewerActions";

/**
 * A list, laid out to be read by whoever may open it.
 *
 * The facts a reader wants come first - who made it, when, how big, who can
 * see it - then the items in either density, filtered by kind and searched.
 * The owner gets the share controls in the same place a reader gets the
 * owner's name; somebody not signed in gets one card inviting them to keep
 * the list, and nothing else that would make the page heavy to pass around.
 */
const VIEW_MODE_KEY = "wr:list-page:view-mode";
const ALL = "all";

function timesText(count: number, noun: string): string {
  if (count === 0) return "";
  return `${noun} ${count === 1 ? STUDY_LIST_COPY.onceSuffix : `${count} ${STUDY_LIST_COPY.timesSuffix}`}`;
}

export default function ListPageView({ list, rows, owner, viewer, shareHref, currentHref, listKey, proposals, burnedIds }: ListPageViewProps) {
  /* The viewer's Burned list, applied to this one when they say so. */
  const [hideBurned] = useHideBurned();
  const burned = useMemo(() => new Set(burnedIds), [burnedIds]);
  const burnedInView = useMemo(() => withoutBurned(rows, burned).hidden, [burned, rows]);
  const [kind, setKind] = useState<string>(ALL);
  /* Removals a member has suggested from this page, so the button says so. */
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const archived = list.archivedAt !== null;
  const canContribute = Boolean(viewer.accountId) && !viewer.isOwner && !archived;

  async function proposeRemoval(row: (typeof rows)[number]) {
    if (!viewer.accountId) return;
    setSuggested((prev) => new Set(prev).add(row.key));
    await fetch(`/api/study/${viewer.accountId}/lists/contributions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listId: list.id, key: listKey, removal: { kind: row.kind, key: row.glyph, subjectId: row.subjectId } }),
    }).catch(() => undefined);
  }
  /*
   * Filing, here too: a member reading somebody's list can tag a row or put
   * it on a list of their own, one at a time, with the same column search
   * has. The hits are the rows; a row WaniKani does not name still files
   * into a saved list, and only the tags need the id.
   */
  const [filerOpen, setFilerOpen] = useFilerOpen();
  const filing = Boolean(viewer.accountId) && filerOpen;
  const filer = useSubjectFiler(viewer.accountId, rows, filing);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(VIEW_MODE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid),
  );

  const kinds = useMemo(() => {
    const counts = new Map<ListItemKind, number>();
    for (const row of rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
    return [...counts.entries()];
  }, [rows]);

  const visible = useMemo(
    () =>
      (hideBurned ? withoutBurned(rows, burned).kept : rows)
        .filter((row) => kind === ALL || row.kind === kind)
        /* The same reading of a query the main search uses: romaji included. */
        .filter((row) => subjectMatchesQuery(search, { glyph: row.glyph, meanings: [row.meaning], readings: [row.reading] })),
    [burned, hideBurned, kind, rows, search],
  );

  const facts = [
    `${STUDY_LIST_COPY.created} ${formatRelativeFromNow(list.createdAt)}`,
    `${STUDY_LIST_COPY.changed} ${formatRelativeFromNow(list.updatedAt)}`,
    timesText(list.copyCount, STUDY_LIST_COPY.copied),
    timesText(list.shareCount, STUDY_LIST_COPY.shared),
  ].filter(Boolean);

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
              <Link href={`/users/${encodeURIComponent(owner.key)}/lists`} className="hover:text-accent">
                {STUDY_LIST_COPY.backToLists}
              </Link>
            </p>
            <h1 className="mt-1 text-2xl font-black text-foreground sm:text-3xl">{list.name}</h1>
            {list.description ? <p className="mt-1 text-sm font-semibold text-foreground/75">{list.description}</p> : null}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-foreground/60">
              <span>
                {STUDY_LIST_COPY.by}{" "}
                <Link href={`/users/${encodeURIComponent(owner.key)}`} className="font-black text-foreground hover:text-accent">
                  {owner.name}
                </Link>
              </span>
              <span>
                {list.itemCount} {list.itemCount === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
              </span>
              {facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
              <span className="subject-pill border-line bg-surface-muted text-foreground/70">
                {LIST_VISIBILITY_DISPLAY[list.visibility].label}
              </span>
              {archived ? <span className="subject-pill border-amber-300 bg-amber-50 text-amber-900">{STUDY_LIST_COPY.archivedPill}</span> : null}
            </p>
          </div>
          {archived ? null : viewer.isOwner && viewer.accountId && shareHref ? (
            <ListShareControls
              listId={list.id}
              accountId={viewer.accountId}
              name={list.name}
              ownerKey={owner.key}
              visibility={list.visibility}
              contributions={list.contributions}
              shareHref={shareHref}
            />
          ) : !viewer.isOwner && viewer.accountId && viewer.key ? (
            <ListViewerActions
              listId={list.id}
              viewerAccountId={viewer.accountId}
              viewerKey={viewer.key}
              listKey={listKey}
              subscribed={viewer.subscribed}
            />
          ) : null}
        </div>
      </header>

      {archived ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{STUDY_LIST_COPY.archivedNotice}</p>
      ) : null}

      {viewer.isOwner && viewer.accountId && !archived ? <ListProposalsPanel proposals={proposals} ownerAccountId={viewer.accountId} /> : null}

      {canContribute && viewer.accountId ? (
        <ListContributeBox listId={list.id} viewerAccountId={viewer.accountId} listKey={listKey} contributions={list.contributions} />
      ) : null}

      {!viewer.signedIn ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div>
            <p className="text-sm font-black text-foreground">{STUDY_LIST_COPY.keepHeading}</p>
            <p className="text-xs font-semibold text-foreground/70">{STUDY_LIST_COPY.keepBody}</p>
          </div>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(currentHref)}`}
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
                <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={chipClass(kind === value)}>
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
            onChange={(next) => {
              setViewMode(next);
              setStoredEnum(VIEW_MODE_KEY, next);
            }}
          />
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-foreground/60">{STUDY_LIST_COPY.emptyPublic}</p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-foreground/60">{STUDY_LIST_COPY.noListsMatch}</p>
        ) : viewMode === SUBJECT_VIEW_MODES.list ? (
          <ul className="mt-3 divide-y divide-line/60">
            {visible.map((row) => (
              <li key={row.key}>
                <ListRow
                  row={row}
                  after={
                    <>
                      {canContribute ? (
                        <ProposeRemovalButton onPropose={() => void proposeRemoval(row)} pending={suggested.has(row.key)} />
                      ) : null}
                      {filing ? <SubjectFilerCell hit={row} filer={filer} className="basis-full pb-2 pl-3 md:basis-auto md:pb-0" /> : null}
                    </>
                  }
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
                  after={
                    <span className="mt-1 flex flex-wrap items-center justify-center gap-1">
                      {canContribute ? (
                        <ProposeRemovalButton onPropose={() => void proposeRemoval(row)} pending={suggested.has(row.key)} />
                      ) : null}
                      {filing ? <SubjectFilerCell hit={row} filer={filer} /> : null}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewer.isOwner && list.visibility === LIST_VISIBILITIES.private ? (
        <p className="text-center text-xs font-semibold text-foreground/60">{STUDY_LIST_COPY.privateNotice}</p>
      ) : null}
    </div>
  );
}
