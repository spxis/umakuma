"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import ApplyWanikaniBurned from "@/app/shared/ApplyWanikaniBurned";
import KanjiSelectionBar from "@/app/shared/KanjiSelectionBar";
import StudyTagListsBody from "@/app/shared/StudyTagListsBody";
import SurfacePagination from "@/app/shared/SurfacePagination";
import type { ListPageItem } from "@/lib/listPageItems";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { SUBJECT_VIEW_MODES, SUBJECT_VIEW_MODE_VALUES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { useHideBurned } from "@/app/shared/useHideBurned";
import { useSubjectSelection } from "@/app/shared/useSubjectSelection";
import { usePersistedEnum } from "@/lib/usePersistedEnum";
import { LIST_ITEM_KINDS, LIST_VISIBILITIES, STUDY_TAGS, SUBJECT_TYPES } from "@/lib/domainConstants";
import { LIST_ITEM_PAGE_SIZE, LIST_ITEM_SORTS, orderListItems, type ListItemSort } from "@/lib/listItemOrder";
import { listWorksheetHref } from "../../practice/practiceAddress";
import { subjectMatchesQuery } from "@/lib/subjectSearch";
import { openViewGlyphViewer } from "@/lib/viewGlyphViewer";

import { SRS_STATUS_FILTER_ALL, type SrsStatusFilter } from "../../shared/SrsStatusFilterGroup";

import ListContributeBox from "./ListContributeBox";
import ListPageControls from "./ListPageControls";
import SplitVocabularyButton from "./SplitVocabularyButton";
import {
  LIST_TYPE_FILTER_ALL,
  listSrsCounts,
  listTypeCounts,
  matchesListSrsFilter,
  matchesListTypeFilter,
  type ListTypeFilter,
} from "./listPageFilters";
import ListItemNoteEditor from "./ListItemNoteEditor";
import type { ListPageViewProps } from "./ListPage.types";
import { useListItemNote } from "./useListItemNote";
import ListProposalsPanel from "./ListProposalsPanel";
import ListGradeBar from "./ListGradeBar";
import ListPageHeader from "./ListPageHeader";
import ListProgressPanel from "./ListProgressPanel";
import ListSourceUpdates from "./ListSourceUpdates";

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
  progress,
  grade,
}: ListPageViewProps) {
  const [typeFilter, setTypeFilter] = useState<ListTypeFilter>(LIST_TYPE_FILTER_ALL);
  const [srsFilter, setSrsFilter] = useState<SrsStatusFilter>(SRS_STATUS_FILTER_ALL);
  const [search, setSearch] = useState("");
  /*
   * The list's own order by default, because somebody arranged it. Every
   * other sort is something a reader asks for once, to find one item.
   */
  const [sort, setSort] = useState<ListItemSort>(LIST_ITEM_SORTS.order);
  const [reversed, setReversed] = useState(false);
  const [itemPage, setItemPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [applied, setApplied] = useState(0);
  const [viewMode, setViewMode] = usePersistedEnum<SubjectViewMode>(VIEW_MODE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid);
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
  const sheetLinks = useMemo(() => {
    if (!list.tag && !live.some((item) => item.listKind === LIST_ITEM_KINDS.kanji)) return null;
    /*
     * Built by the helper, never by hand. An unlisted list's sheet carries
     * `?key=`, and a query appended to it by string surgery is how the page
     * once 404ed on exactly the lists that needed sharing most.
     */
    const target = { tag: list.tag, name: list.name };
    const from = viewer.isOwner ? undefined : { owner: owner.key, key: listKey };
    const worksheet = listWorksheetHref(practicePath, target, from);
    return worksheet ? { worksheet } : null;
  }, [list.name, list.tag, listKey, live, owner.key, practicePath, viewer.isOwner]);

  /*
   * Everything the chips are counted against: the list, less what is burned
   * and hidden, less what the search excluded. Each row of chips then counts
   * over this with its *own* filter left out, so a chip reading 3 yields three
   * rows - the rule the study explorer's counts were fixed to obey.
   */
  const searched = useMemo(
    () =>
      live
        .filter((item) => list.tag === STUDY_TAGS.burned || !hideBurned || !item.studyTags?.burned)
        .filter((item) =>
          subjectMatchesQuery(search, { glyph: item.characters, meanings: item.meanings, readings: item.readings ?? [] }),
        ),
    [hideBurned, list.tag, live, search],
  );

  const typeCounts = useMemo(
    () => listTypeCounts(searched.filter((item) => matchesListSrsFilter(item, srsFilter))),
    [searched, srsFilter],
  );
  const srsCounts = useMemo(
    () => listSrsCounts(searched.filter((item) => matchesListTypeFilter(item, typeFilter))),
    [searched, typeFilter],
  );

  const burnedInView = useMemo(() => live.filter((item) => item.studyTags?.burned).length, [live]);

  /*
   * The chosen items that are words, which are the only ones there is anything
   * to split. Chosen items are keyed by their glyph, so this is the list's own
   * rows read back rather than the selection reinterpreted.
   */
  const chosenWords = useMemo(
    () =>
      live
        .filter((item) => item.subjectType === SUBJECT_TYPES.vocabulary && selection.chosen.has(item.characters))
        .map((item) => item.characters),
    [live, selection.chosen],
  );

  const matched = useMemo(
    () =>
      orderListItems(
        searched
          .filter((item) => matchesListTypeFilter(item, typeFilter))
          .filter((item) => matchesListSrsFilter(item, srsFilter)),
        (item) => ({ glyph: item.characters, meaning: item.meanings[0] ?? "", level: item.wkLevel ?? null }),
        sort,
        reversed,
      ),
    [reversed, searched, sort, srsFilter, typeFilter],
  );

  /*
   * A list holds up to five hundred items, and five hundred glyph cards is a
   * page that takes a moment to lay out and a long scroll to leave. The page
   * is clamped rather than trusted: narrowing by kind or by search from page
   * four otherwise reads as "nothing matches" when four things do.
   */
  const pageCount = Math.max(1, Math.ceil(matched.length / LIST_ITEM_PAGE_SIZE));
  const page = Math.min(Math.max(1, itemPage), pageCount);
  const visible = useMemo(
    () => matched.slice((page - 1) * LIST_ITEM_PAGE_SIZE, page * LIST_ITEM_PAGE_SIZE),
    [matched, page],
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

  return (
    <div className="space-y-4">
      <ListPageHeader
        list={list}
        owner={owner}
        viewer={viewer}
        shareHref={shareHref}
        listKey={listKey}
        archived={archived}
        itemCount={live.length}
      />

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
      {/*
        * Only on a list more than one person is on. A list nobody shares has
        * one bar, which is the reader's own progress said twice - the item
        * cards already carry it.
        */}
      {/*
        * Not on a built-in list. Trouble and Favourites are filled by tagging
        * while you study and emptied by untagging; there is no point at which
        * somebody finishes them, so there is nothing to mark.
        */}
      {!list.tag ? (
        <ListGradeBar
          accountId={viewer.accountId}
          listId={list.id}
          canMark={viewer.isOwner && !archived}
          studiedAt={list.studiedAt}
          updatedAt={list.updatedAt}
          grade={grade}
        />
      ) : null}

      {progress ? (
        <ListProgressPanel members={progress.members} trackable={progress.trackable} untracked={progress.untracked} />
      ) : null}

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
        <ListPageControls
          typeFilter={typeFilter}
          onTypeFilter={(next) => {
            setTypeFilter(next);
            setItemPage(1);
          }}
          typeCounts={typeCounts}
          srsFilter={srsFilter}
          onSrsFilter={(next) => {
            setSrsFilter(next);
            setItemPage(1);
          }}
          srsCounts={srsCounts}
          search={search}
          onSearch={(next) => {
            setSearch(next);
            /* A new search is a new list; it starts at its first page again. */
            setItemPage(1);
          }}
          searchOptions={live.map((item) => ({ value: item.characters, label: item.meanings[0] ?? "" }))}
          hideBurned={hideBurned}
          burnedInView={burnedInView}
          showHideBurned={Boolean(viewer.accountId) && list.tag !== STUDY_TAGS.burned}
          canEdit={canEdit}
          editing={editing}
          onEditing={setEditing}
          worksheetHref={sheetLinks?.worksheet ?? null}
          sort={sort}
          onSort={(next) => {
            setSort(next);
            setItemPage(1);
          }}
          reversed={reversed}
          onReversed={setReversed}
          showSort={live.length > 1}
          selection={selection}
          showSelection={Boolean(viewer.accountId)}
          viewMode={viewMode}
          onViewMode={setViewMode}
        />

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
            >
              {/*
                * Only on a list the reader may change, and only their own
                * saved lists: Trouble and Favourites are filled by tagging
                * while you study, so there is nothing here to add a kanji to.
                */}
              {canEdit && viewer.accountId && !list.tag ? (
                <SplitVocabularyButton
                  accountId={viewer.accountId}
                  listId={list.id}
                  words={chosenWords}
                  existing={live.map((item) => ({ kind: item.listKind, key: item.listKey }))}
                  onSplit={selection.cancel}
                />
              ) : null}
            </KanjiSelectionBar>
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
              /* Held open whether or not Edit is on, so pressing it moves nothing. */
              reserveControls={canEdit}
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
          {/*
            * Beneath the items only. Unlike the practice sheet - whose foot is
            * three thousand pixels of tracing squares down - a page of sixty
            * glyphs is a screen or two, and a pager above them would sit
            * between the controls and the list saying "1 of 1" to most lists.
            */}
          <SurfacePagination
            slot="bottom"
            placement={pageCount > 1 ? "bottom" : "none"}
            page={page}
            pageCount={pageCount}
            onPageChange={setItemPage}
            summary={pageCount > 1 ? `${STUDY_LIST_COPY.showing} ${visible.length} ${STUDY_LIST_COPY.of} ${matched.length}` : undefined}
            className="mt-3"
          />
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
