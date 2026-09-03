"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import ApplyWanikaniBurned from "@/app/shared/ApplyWanikaniBurned";
import HideBurnedToggle from "@/app/shared/HideBurnedToggle";
import KanjiSelectionBar from "@/app/shared/KanjiSelectionBar";
import ListSearchField from "@/app/shared/ListSearchField";
import StudyTagListsBody from "@/app/shared/StudyTagListsBody";
import type { ListPageItem } from "@/lib/listPageItems";
import { SubjectSelectionToggle } from "@/app/shared/SubjectSelectionControls";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import ListMetaLine from "@/app/shared/ListMetaLine";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_TAG_LIST_COPY } from "@/app/shared/studyTagListsUi";
import { SUBJECT_VIEW_MODES, SUBJECT_VIEW_MODE_VALUES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { useHideBurned } from "@/app/shared/useHideBurned";
import { useSubjectSelection } from "@/app/shared/useSubjectSelection";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import {
  LIST_ITEM_KINDS,
  LIST_ITEM_KIND_DISPLAY,
  LIST_VISIBILITIES,
  LIST_VISIBILITY_DISPLAY,
  STUDY_TAGS,
  type ListItemKind,
} from "@/lib/domainConstants";
import { listWorksheetHref } from "../../practice/practiceAddress";
import { subjectMatchesQuery } from "@/lib/subjectSearch";
import { openViewGlyphViewer } from "@/lib/viewGlyphViewer";

import ListContributeBox from "./ListContributeBox";
import ListItemNoteEditor from "./ListItemNoteEditor";
import type { ListPageViewProps } from "./ListPage.types";
import { useListItemNote } from "./useListItemNote";
import ListProposalsPanel from "./ListProposalsPanel";
import ListSourceUpdates from "./ListSourceUpdates";
import ListShareControls from "./ListShareControls";
import ListViewerActions from "./ListViewerActions";

/**
 * A list, laid out to be read by whoever may open it.
 *
 * The one view of a list. There used to be two - a panel that opened from a
 * button and a page that opened from the name - so a member could not tell
 * what pressing a thing would give them, and the two drifted apart. This is
 * the page, and it holds what the panel had: the shared subject cards and
 * rows, choosing and the practice sheet, the glyph viewer, taking an item
 * out behind an Edit toggle, and the WaniKani offer on the Burned list.
 */
const VIEW_MODE_KEY = "wr:list-page:view-mode";
const ALL = "all";

/** The same shape as the Edit toggle beside it, since they are the same kind of thing. */
const ACTION_PILL =
  "inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-xs font-bold uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted";

export default function ListPageView({
  list,
  items,
  owner,
  viewer,
  shareHref,
  currentHref,
  listKey,
  proposals,
  practicePath,
}: ListPageViewProps) {
  const [kind, setKind] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [applied, setApplied] = useState(0);
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(VIEW_MODE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid),
  );
  const [hideBurned] = useHideBurned();
  const selection = useSubjectSelection(`list:${list.id}`);

  const archived = list.archivedAt !== null;
  const canContribute = Boolean(viewer.accountId) && !viewer.isOwner && !archived && !list.tag;
  const canEdit = viewer.isOwner && !archived;
  const notes = useListItemNote(viewer.accountId, list.id);

  const live = useMemo(() => items.filter((item) => !removed.has(item.subjectId)), [items, removed]);

  /*
   * A worksheet is a sheet of kanji, so a list holding none is not offered
   * one, and a visitor with no page of their own has nowhere to build it.
   *
   * Somebody else's list is named in the address - `/practice/list/john/week-1`
   * - rather than looked up on the reader's own shelf. That is what this was
   * waiting for: the sheet is built at the reader's address, so "Week 1" used
   * to mean the reader's own Week 1, a different list of the same name, and
   * the safe thing was to offer nothing at all. Now the address says whose
   * list it is and the sheet is the list on screen.
   */
  const worksheetHref = useMemo(() => {
    if (!list.tag && !live.some((item) => item.listKind === LIST_ITEM_KINDS.kanji)) return null;
    return listWorksheetHref(
      practicePath,
      { tag: list.tag, name: list.name },
      viewer.isOwner ? undefined : { owner: owner.key, key: listKey },
    );
  }, [list.name, list.tag, listKey, live, owner.key, practicePath, viewer.isOwner]);

  const kinds = useMemo(() => {
    const counts = new Map<ListItemKind, number>();
    for (const item of live) counts.set(item.listKind, (counts.get(item.listKind) ?? 0) + 1);
    return [...counts.entries()];
  }, [live]);

  const burnedInView = useMemo(() => live.filter((item) => item.studyTags?.burned).length, [live]);

  const visible = useMemo(
    () =>
      live
        .filter((item) => kind === ALL || item.listKind === kind)
        .filter((item) => list.tag === STUDY_TAGS.burned || !hideBurned || !item.studyTags?.burned)
        .filter((item) =>
          subjectMatchesQuery(search, { glyph: item.characters, meanings: item.meanings, readings: item.readings ?? [] }),
        ),
    [hideBurned, kind, list.tag, live, search],
  );

  /* Taking an item out: untagging a built-in list, or dropping it from a saved one. */
  const remove = useCallback(
    async (subjectId: number, listKind: string, key: string) => {
      if (!viewer.accountId) return;
      setRemoved((current) => new Set(current).add(subjectId));
      const response = await (list.tag
        ? fetch(`/api/study/${viewer.accountId}/tags`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ subjectId, tag: list.tag, enabled: false }),
          })
        : fetch(`/api/study/${viewer.accountId}/lists/${list.id}/items`, {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: listKind, key }),
          })
      ).catch(() => null);
      if (!response?.ok) {
        setRemoved((current) => {
          const next = new Set(current);
          next.delete(subjectId);
          return next;
        });
      }
    },
    [list.id, list.tag, viewer.accountId],
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
                {live.length} {live.length === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
              </span>
              {list.tag ? (
                <span>{STUDY_LIST_COPY.builtIn}</span>
              ) : (
                <>
                  <ListMetaLine
                    facts={{
                      createdAt: list.createdAt,
                      updatedAt: list.updatedAt,
                      subscriberCount: list.subscriberCount,
                      copyCount: list.copyCount,
                      shareCount: list.shareCount,
                    }}
                    className="text-xs"
                  />
                  <span className="subject-pill border-line bg-surface-muted text-foreground/70">
                    {LIST_VISIBILITY_DISPLAY[list.visibility].label}
                  </span>
                </>
              )}
              {archived ? (
                <span className="subject-pill border-amber-300 bg-amber-50 text-amber-900">{STUDY_LIST_COPY.archivedPill}</span>
              ) : null}
            </p>
          </div>
          {archived || list.tag ? null : viewer.isOwner && viewer.accountId && shareHref ? (
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
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          {STUDY_LIST_COPY.archivedNotice}
        </p>
      ) : null}

      {viewer.isOwner && viewer.accountId && !archived && !list.tag ? (
        <ListProposalsPanel proposals={proposals} ownerAccountId={viewer.accountId} />
      ) : null}

      {/*
        * A copy asks the list it came from what is new. It draws nothing at all
        * unless there is something, so a list with no source - almost all of
        * them - is unchanged by this being here.
        */}
      {viewer.isOwner && viewer.accountId && !archived && !list.tag && list.hasSource ? (
        <ListSourceUpdates accountId={viewer.accountId} listId={list.id} />
      ) : null}

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
                {STUDY_LIST_COPY.allKinds} · {live.length}
              </button>
              {kinds.map(([value, count]) => (
                <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={chipClass(kind === value)}>
                  {LIST_ITEM_KIND_DISPLAY[value].plural} · {count}
                </button>
              ))}
            </>
          ) : null}
          {/*
            * A line of its own on a phone. Squeezed in beside the kind chips
            * and five controls, the box was down to four characters of its own
            * placeholder - "Sea" - which is not a search field.
            */}
          <ListSearchField
            value={search}
            onChange={setSearch}
            label={STUDY_LIST_COPY.searchItems}
            options={live.map((item) => ({ value: item.characters, label: item.meanings[0] ?? "" }))}
            className="w-full basis-full sm:w-auto sm:basis-48"
          />
          {viewer.accountId && list.tag !== STUDY_TAGS.burned ? (
            <HideBurnedToggle hidden={hideBurned ? burnedInView : 0} burnedInView={burnedInView} />
          ) : null}
          {canEdit ? (
            <button
              type="button"
              aria-pressed={editing}
              onClick={() => setEditing((was) => !was)}
              className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-xs font-bold uppercase tracking-[0.08em] transition ${
                editing ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
              }`}
            >
              {editing ? STUDY_TAG_LIST_COPY.editingDone : STUDY_TAG_LIST_COPY.edit}
            </button>
          ) : null}
          {/*
            * The worksheet, from the page that shows the list.
            *
            * It was reachable only from the card on the shelf, and only as a
            * sheet of hand-picked characters - so the page you read a list on
            * could not print it, and the link the card built went stale as
            * soon as the list changed.
            */}
          {worksheetHref ? (
            <>
              <Link href={worksheetHref} className={ACTION_PILL} title={STUDY_LIST_COPY.worksheetHint}>
                {STUDY_LIST_COPY.worksheet}
              </Link>
              <Link href={`${worksheetHref}?go=1`} className={ACTION_PILL}>
                {STUDY_LIST_COPY.print}
              </Link>
            </>
          ) : null}
          {viewer.accountId ? <SubjectSelectionToggle selection={selection} /> : null}
          <SubjectViewModeToggle
            value={viewMode}
            onChange={(next) => {
              setViewMode(next);
              setStoredEnum(VIEW_MODE_KEY, next);
            }}
          />
        </div>

        {viewer.isOwner && viewer.accountId && list.tag === STUDY_TAGS.burned ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-line">
            <ApplyWanikaniBurned accountId={viewer.accountId} onApplied={() => setApplied((value) => value + 1)} />
          </div>
        ) : null}
        {applied > 0 ? <p className="mt-2 text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.reloadForApplied}</p> : null}

        {selection.choosing ? (
          <div className="mt-2">
            <KanjiSelectionBar
              selection={selection}
              visibleKeys={visible.map((item) => item.characters)}
              accountId={viewer.accountId}
              practicePath={practicePath}
            />
          </div>
        ) : null}

        <div className="mt-3">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-foreground/60">
              {live.length === 0 ? STUDY_LIST_COPY.emptyPublic : STUDY_LIST_COPY.noListsMatch}
            </p>
          ) : (
            <StudyTagListsBody
              items={visible}
              viewMode={viewMode}
              selection={viewer.accountId ? selection : undefined}
              /*
               * A written note is shown to every reader; the invitation to
               * write one appears only while editing, or a list of glyphs
               * grows a row of "Add a note" under items nobody meant to annotate.
               */
              noteFor={(item) => notes.noteFor(item as ListPageItem)}
              onEditNote={editing && canEdit && !list.tag ? (item) => notes.edit(item as ListPageItem) : undefined}
              onOpen={(index) =>
                openViewGlyphViewer({
                  items: visible,
                  startIndex: index,
                  accountId: viewer.accountId ?? undefined,
                  title: list.name,
                })
              }
              onRemove={
                editing && canEdit
                  ? (item) => {
                      const held = visible.find((candidate) => candidate.subjectId === item.subjectId);
                      if (held) void remove(held.subjectId, held.listKind, held.listKey);
                    }
                  : undefined
              }
            />
          )}
        </div>
      </section>

      {viewer.isOwner && !list.tag && list.visibility === LIST_VISIBILITIES.private ? (
        <p className="text-center text-xs font-semibold text-foreground/60">{STUDY_LIST_COPY.privateNotice}</p>
      ) : null}

      {notes.open ? (
        <ListItemNoteEditor
          glyph={notes.open.characters}
          note={notes.noteFor(notes.open)}
          saving={notes.saving}
          error={notes.error}
          onSave={(note) => void notes.save(note)}
          onClose={notes.close}
        />
      ) : null}
    </div>
  );
}
