"use client";

import { useState } from "react";

import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_TAG_LIST_LABELS } from "@/app/shared/studyTagListsUi";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import { LIST_ITEM_KINDS } from "@/lib/domainConstants";
import { listKanji, type StudyListItemRef, type StudyListSummary } from "@/lib/studyListRules";
import type { TaggedListSummary } from "@/lib/studySubjectTags";

import { LIST_SORTS, type ListCard, type ListSort } from "./StudyList.types";
import StudyListCard from "./StudyListCard";
import { sortListCards } from "./sortListCards";

/**
 * The saved lists, each showing what is in it.
 *
 * A preview of the characters rather than a count alone, because the question a
 * parent actually has is "what is in Week 3" and a number does not answer it.
 * The characters are the list, so they are what the card shows.
 */

const LIST_VIEW_MODE_STORAGE_KEY = "wr:lists:view-mode";
const LIST_SORT_STORAGE_KEY = "wr:lists:sort";
const LIST_SORT_LABELS: Record<ListSort, string> = {
  updated: STUDY_LIST_COPY.sortUpdated,
  name: STUDY_LIST_COPY.sortName,
  size: STUDY_LIST_COPY.sortSize,
};

export default function StudyListCards({
  lists,
  taggedLists = [],
  accountId,
  practicePath,
  canEdit,
}: {
  lists: StudyListSummary[];
  /** Trouble and Favourites, always both, empty ones included. */
  taggedLists?: TaggedListSummary[];
  accountId: string;
  practicePath: string;
  canEdit: boolean;
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  /* Renames the server has accepted, so the page shows them without a reload. */
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  /* The same for edited contents, which also change the count and the sheet. */
  const [edited, setEdited] = useState<Record<string, StudyListItemRef[]>>({});
  /* Searchable and sortable, like every list of data here; remembered per browser. */
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ListSort>(() => getStoredEnum(LIST_SORT_STORAGE_KEY, LIST_SORTS, "updated"));
  const [reversed, setReversed] = useState(false);
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
    tag: tagged.tag,
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
        tag: null,
      };
    });
  const shown = sortListCards(saved, sort, reversed, query);
  const rows = viewMode === SUBJECT_VIEW_MODES.list;

  /* A tagged sheet is addressed by its source, so it takes the whole list; a saved one traces its kanji. */
  const practiceHrefFor = (card: ListCard) =>
    card.tag
      ? `${practicePath}/${card.tag}`
      : `${practicePath}/picked?picked=${encodeURIComponent(listKanji(card.items).join(""))}`;

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
      practiceHref={practiceHrefFor(card)}
      canEdit={canEdit}
      onDelete={() => setPendingRemoval(card.id)}
      onRenamed={(name) => setRenamed((prev) => ({ ...prev, [card.id]: name }))}
      onItemsChanged={(items) => setEdited((prev) => ({ ...prev, [card.id]: items }))}
    />
  );

  const CONTROL =
    "h-8 rounded-full border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={STUDY_LIST_COPY.searchLists}
          aria-label={STUDY_LIST_COPY.searchLists}
          className="h-8 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-foreground"
        />
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
          {STUDY_LIST_COPY.sortLabel}
          <select
            value={sort}
            onChange={(event) => {
              const next = event.target.value as ListSort;
              setSort(next);
              setStoredEnum(LIST_SORT_STORAGE_KEY, next);
            }}
            className={CONTROL}
          >
            {LIST_SORTS.map((option) => (
              <option key={option} value={option}>
                {LIST_SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={reversed}
          onClick={() => setReversed((was) => !was)}
          className={`${CONTROL} ${reversed ? "border-accent text-accent" : ""}`}
        >
          {STUDY_LIST_COPY.reverse}
        </button>
        <SubjectViewModeToggle
          value={viewMode}
          onChange={(next) => {
            setViewMode(next);
            setStoredEnum(LIST_VIEW_MODE_STORAGE_KEY, next);
          }}
        />
      </div>

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
          <ul className={gridClass}>{shown.map(renderCard)}</ul>
        )}
      </section>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={STUDY_LIST_COPY.removeConfirmTitle}
        description={STUDY_LIST_COPY.removeConfirmBody}
        confirmLabel={STUDY_LIST_COPY.remove}
        onConfirm={() => {
          if (pendingRemoval) void remove(pendingRemoval);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}
