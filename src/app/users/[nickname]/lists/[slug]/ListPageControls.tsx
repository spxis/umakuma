"use client";

import Link from "next/link";

import HideBurnedToggle from "@/app/shared/HideBurnedToggle";
import ListSearchField from "@/app/shared/ListSearchField";
import { SubjectSelectionToggle } from "@/app/shared/SubjectSelectionControls";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_TAG_LIST_COPY } from "@/app/shared/studyTagListsUi";
import { type SubjectType } from "@/lib/domainConstants";

import SrsStatusFilterGroup from "../../shared/SrsStatusFilterGroup";
import SubjectTypeFilterGroup from "../../shared/SubjectTypeFilterGroup";

import ListItemSortControl from "./ListItemSortControl";
import type { ListPageControlsProps } from "./ListPage.types";
import { LIST_TYPE_FILTER_ALL, listHasMixedStages, listHasMixedTypes, listTypeChipStates } from "./listPageFilters";

/** The same shape as the Edit toggle beside it, since they are the same kind of thing. */
const ACTION_PILL =
  "inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-xs font-bold uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted";

/**
 * One row of controls over a list: what to show, what to search, and what to
 * do with it.
 *
 * Lifted out of the page when the filters arrived and the file crossed the
 * five-hundred-line gate. Every control here is a shared one - the coloured
 * subject chips, the stage chips, the search field, the sort, the density
 * toggle - so this file is the order they sit in and nothing else.
 */
export default function ListPageControls({
  typeFilter,
  onTypeFilter,
  typeCounts,
  srsFilter,
  onSrsFilter,
  srsCounts,
  search,
  onSearch,
  searchOptions,
  hideBurned,
  burnedInView,
  showHideBurned,
  canEdit,
  editing,
  onEditing,
  worksheetHref,
  sort,
  onSort,
  reversed,
  onReversed,
  showSort,
  selection,
  showSelection,
  viewMode,
  onViewMode,
}: ListPageControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/*
        * The same chips the explorers filter by, in the subject colours.
        *
        * This row used to hold three of its own in the accent colour -
        * ALL, KANJI, WORDS - which is a second answer to a question the
        * site had already answered, and the worse one: a list holding
        * radicals had no chip to say so, and a word was a Word here and
        * VOCAB on every other surface. Kinds the list does not hold are
        * left out rather than drawn as a zero nobody can press.
        */}
      {listHasMixedTypes(typeCounts) ? (
        <SubjectTypeFilterGroup
          counts={typeCounts}
          allLabel={STUDY_LIST_COPY.allKinds}
          allActive={typeFilter === LIST_TYPE_FILTER_ALL}
          activeTypes={listTypeChipStates(typeFilter)}
          onClickAll={() => onTypeFilter(LIST_TYPE_FILTER_ALL)}
          onClickType={(type: SubjectType) => onTypeFilter(typeFilter === type ? LIST_TYPE_FILTER_ALL : type)}
          className="flex flex-wrap items-center gap-2"
          hideZeroInactive
        />
      ) : null}
      {/*
        * And how far along the reader is with them.
        *
        * The list has shown an SRS badge on every row since it was built
        * and had no way to ask for one stage: the reader could see that
        * three of fifteen were still apprentice and had to find them by
        * eye. Same chips, same colours as the badge they filter.
        */}
      {listHasMixedStages(srsCounts) ? (
        <SrsStatusFilterGroup
          counts={srsCounts}
          value={srsFilter}
          onChange={onSrsFilter}
          allLabel={STUDY_LIST_COPY.allStages}
          ariaLabel={STUDY_LIST_COPY.stageFilters}
        />
      ) : null}
      {/*
        * A line of its own on a phone. Squeezed in beside the kind chips
        * and five controls, the box was down to four characters of its own
        * placeholder - "Sea" - which is not a search field.
        */}
      <ListSearchField
        value={search}
        onChange={onSearch}
        label={STUDY_LIST_COPY.searchItems}
        options={searchOptions}
        className="w-full basis-full sm:w-auto sm:basis-48"
      />
      {showHideBurned ? (
        <HideBurnedToggle hidden={hideBurned ? burnedInView : 0} burnedInView={burnedInView} />
      ) : null}
      {canEdit ? (
        <button
          type="button"
          aria-pressed={editing}
          onClick={() => onEditing(!editing)}
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
      {/*
        * Worksheet goes to the sheet; Print lives on the sheet and opens
        * the dialog there. A Print here that changed the page was a
        * button that did not do what it said.
        */}
      {worksheetHref ? (
        <Link href={worksheetHref} className={ACTION_PILL} title={STUDY_LIST_COPY.worksheetHint}>
          {STUDY_LIST_COPY.worksheet}
        </Link>
      ) : null}
      {/*
        * Offered only where there is something to sort. On a list of four
        * a sort control is a control that cannot change anything, and the
        * row is already carrying five.
        */}
      {showSort ? (
        <ListItemSortControl
          sort={sort}
          onSort={onSort}
          reversed={reversed}
          onReversed={onReversed}
        />
      ) : null}
      {showSelection ? <SubjectSelectionToggle selection={selection} /> : null}
      <SubjectViewModeToggle
        value={viewMode}
        onChange={onViewMode}
      />
    </div>
  );
}
