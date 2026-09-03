"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_TAG_LIST_LABELS } from "@/app/shared/studyTagListsUi";
import ListShelfControls from "@/app/shared/ListShelfControls";
import SurfacePagination from "@/app/shared/SurfacePagination";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import {
  LIST_SHELF_SORTS,
  LIST_SHELF_SORT_VALUES,
  orderShelf,
  pageOfShelf,
  type ListShelfSort,
} from "@/lib/listShelfOrder";
import { LIST_ITEM_KINDS, LIST_VISIBILITIES } from "@/lib/domainConstants";
import { listHref, listKanji, tagListHref, type StudyListItemRef, type StudyListSummary } from "@/lib/studyListRules";
import type { TaggedListSummary } from "@/lib/studySubjectTags";

import { listWorksheetHref } from "../practice/practiceAddress";

import { type ListCard } from "./StudyList.types";
import StudyListCard from "./StudyListCard";
import { listCardFacts } from "./sortListCards";

/**
 * The saved lists, each showing what is in it.
 *
 * A preview of the characters rather than a count alone, because the question a
 * parent actually has is "what is in Week 3" and a number does not answer it.
 * The characters are the list, so they are what the card shows.
 */

const LIST_VIEW_MODE_STORAGE_KEY = "wr:lists:view-mode";
const LIST_SORT_STORAGE_KEY = "wr:lists:sort";
export default function StudyListCards({
  lists,
  taggedLists = [],
  accountId,
  owner,
  practicePath,
  canEdit,
}: {
  lists: StudyListSummary[];
  /** Trouble and Favourites, always both, empty ones included. */
  taggedLists?: TaggedListSummary[];
  accountId: string;
  /** The owner's address segment, for each list's own page. */
  owner: string;
  practicePath: string;
  canEdit: boolean;
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const router = useRouter();
  /* Renames the server has accepted, so the page shows them without a reload. */
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  /* The same for edited contents, which also change the count and the sheet. */
  const [edited, setEdited] = useState<Record<string, StudyListItemRef[]>>({});
  /* Searchable and sortable, like every list of data here; remembered per browser. */
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ListShelfSort>(() =>
    getStoredEnum(LIST_SORT_STORAGE_KEY, LIST_SHELF_SORT_VALUES, LIST_SHELF_SORTS.updated));
  const [reversed, setReversed] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  /*
   * Cards to browse what a week holds, rows to scan many lists at once - the
   * same pair every subject surface offers, remembered for this one.
   */
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(LIST_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid));

  /*
   * Two kinds, kept apart.
   *
   * Trouble and Favourites are permanent: they fill themselves as a member
   * tags while studying, and there is nothing to rename or delete because
   * untagging the last item empties a list rather than removing it. Saved
   * lists are the opposite - made, renamed and thrown away at will. Run
   * together in one grid they invited a member to look for a delete on a card
   * that has none, so each kind gets its own section and says plainly what it
   * is.
   */
  const permanent: ListCard[] = taggedLists.map((tagged) => ({
    id: `tag:${tagged.tag}`,
    name: STUDY_TAG_LIST_LABELS[tagged.tag],
    items: tagged.characters.map((key) => ({ kind: LIST_ITEM_KINDS.kanji, key })),
    count: tagged.count,
    updatedAt: null,
    /* A tag row has no history: it was never made and is never shared. */
    meta: null,
    tag: tagged.tag,
    href: tagListHref(owner, tagged.tag),
    visibility: null,
  }));

  const saved: ListCard[] = lists
    .filter((list) => !removed.has(list.id))
    .map((list) => {
      /* An edit changes the count and the practice sheet, not only the preview. */
      const items = edited[list.id] ?? list.items;
      return {
        id: list.id,
        name: renamed[list.id] ?? list.name,
        items,
        count: items.length,
        updatedAt: list.updatedAt,
        meta: {
          /* The card prints the count beside the name already. */
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          subscriberCount: list.subscriberCount,
          copyCount: list.copyCount,
          shareCount: list.shareCount,
        },
        tag: null,
        href: listHref(owner, renamed[list.id] ?? list.name),
        visibility: list.visibility,
      };
    });
  /*
   * A hundred lists is the cap, and four to a row means the last twenty were
   * a scroll nobody made. Searching from page four would leave a reader past
   * the end of a shorter answer, so the page is clamped rather than trusted.
   */
  const matched = orderShelf(saved, listCardFacts, sort, reversed, query);
  const shelf = pageOfShelf(matched, page);
  const shown = shelf.rows;
  /* The confirmation says what will happen: a shared list is archived, not deleted. */
  const pendingIsShared = Boolean(
    pendingRemoval && lists.find((list) => list.id === pendingRemoval && list.visibility !== LIST_VISIBILITIES.private),
  );
  const rows = viewMode === SUBJECT_VIEW_MODES.list;

  /*
   * One address for a list's worksheet, shared with the list's own page.
   *
   * A saved list used to be built as a picked sheet with every one of its
   * characters in the query string: it broke on a long list, went stale the
   * moment the list changed, and could not be sent to anybody as a link to
   * "my Week 1 sheet". It is named now. A list with no kanji in it has no
   * sheet to offer, since a worksheet is squares to write characters in.
   */
  const sheetLinksFor = (card: ListCard) => {
    if (!card.tag && listKanji(card.items).length === 0) return null;
    const target = { tag: card.tag, name: card.name };
    const worksheet = listWorksheetHref(practicePath, target);
    return worksheet ? { worksheet } : null;
  };

  async function remove(id: string) {
    setPendingRemoval(null);

    // Hidden first, restored if the server disagrees: deleting your own list
    // should feel immediate, and a failure is rare enough to explain after.
    setRemoved((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("delete failed");
      /* Archived rather than deleted: the page shows it in its new section. */
      const body = (await response.json().catch(() => null)) as { archived?: boolean } | null;
      if (body?.archived) router.refresh();
    } catch {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setError(STUDY_LIST_COPY.removeFailed);
    }
  }

  if (permanent.length === 0 && saved.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface-muted p-5">
        <p className="text-sm font-black text-foreground/80">{STUDY_LIST_COPY.empty}</p>
        <p className="mt-1 text-xs text-foreground/60">{STUDY_LIST_COPY.emptyHint}</p>
      </div>
    );
  }

  const gridClass = rows
    ? "space-y-1.5"
    : "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]";

  const renderCard = (card: ListCard) => (
    <StudyListCard
      key={card.id}
      card={card}
      rows={rows}
      accountId={accountId}
      sheetLinks={sheetLinksFor(card)}
      canEdit={canEdit}
      onDelete={() => setPendingRemoval(card.id)}
      onRenamed={(name) => setRenamed((prev) => ({ ...prev, [card.id]: name }))}
      onItemsChanged={(items) => setEdited((prev) => ({ ...prev, [card.id]: items }))}
    />
  );

  return (
    <>
      <ListShelfControls
        query={query}
        onQuery={(next) => {
          setQuery(next);
          /* A new search is a new shelf; it starts at its first page again. */
          setPage(1);
        }}
        sort={sort}
        onSort={(next) => {
          setSort(next);
          setStoredEnum(LIST_SORT_STORAGE_KEY, next);
          setPage(1);
        }}
        reversed={reversed}
        onReversed={setReversed}
        viewMode={viewMode}
        onViewMode={(next) => {
          setViewMode(next);
          setStoredEnum(LIST_VIEW_MODE_STORAGE_KEY, next);
        }}
      />

      {error ? <p className="mb-3 text-xs font-semibold text-rose-600">{error}</p> : null}

      {permanent.length > 0 ? (
        <section className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            {STUDY_LIST_COPY.permanentHeading}
          </h2>
          <p className="mb-2 text-xs text-foreground/60">{STUDY_LIST_COPY.permanentBlurb}</p>
          <ul className={gridClass}>{permanent.map(renderCard)}</ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {STUDY_LIST_COPY.savedHeading}
        </h2>
        <p className="mb-2 text-xs text-foreground/60">{STUDY_LIST_COPY.savedBlurb}</p>
        {saved.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface-muted p-4 text-xs text-foreground/60">
            {STUDY_LIST_COPY.emptyHint}
          </p>
        ) : shown.length === 0 ? (
          /* Different from empty: the lists are there and the search hid them. */
          <p className="rounded-2xl border border-line bg-surface-muted p-4 text-xs text-foreground/60">
            {STUDY_LIST_COPY.noListsMatch}
          </p>
        ) : (
          <>
            <ul className={gridClass}>{shown.map(renderCard)}</ul>
            {/*
              * At the foot only. A shelf is a screen or two of cards, not the
              * practice sheet's three thousand pixels of tracing squares, so
              * a pager at both ends would be a control above the first card
              * saying "page 1 of 1" to almost everybody.
              */}
            <SurfacePagination
              slot="bottom"
              placement={shelf.pageCount > 1 ? "bottom" : "none"}
              page={shelf.page}
              pageCount={shelf.pageCount}
              onPageChange={setPage}
              className="mt-3"
            />
          </>
        )}
      </section>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={pendingIsShared ? STUDY_LIST_COPY.archiveConfirmTitle : STUDY_LIST_COPY.removeConfirmTitle}
        description={pendingIsShared ? STUDY_LIST_COPY.archiveConfirmBody : STUDY_LIST_COPY.removeConfirmBody}
        confirmLabel={STUDY_LIST_COPY.remove}
        onConfirm={() => {
          if (pendingRemoval) void remove(pendingRemoval);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}
