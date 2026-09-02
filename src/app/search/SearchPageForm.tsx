"use client";

import GlobalSearchSuggestList from "@/app/shared/GlobalSearchSuggestList";
import RadicalSearchPanel from "@/app/shared/RadicalSearchPanel";
import SearchCommandHint from "@/app/shared/SearchCommandHint";
import RecentItems from "@/app/shared/RecentItems";
import SearchComboboxField from "@/app/shared/SearchComboboxField";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { searchResultsHref, type SearchFilters } from "@/lib/searchFilters";
import { formatRadicalCommand, parseSearchCommand } from "@/lib/searchCommands";
import { useSearchCombobox } from "@/lib/useSearchCombobox";

import { SEARCH_PAGE_INPUT_ID, focusFirstSearchResult } from "./searchFocus";

const LISTBOX_ID = "search-page-suggest";

/**
 * The search page's own box, which is the header's box at reading size.
 *
 * It was a plain form: no suggestions, different chrome, and a member who had
 * just used the header's autocomplete found it missing on the page the header
 * sent them to. Both now run the same combobox, so what you learn in one works
 * in the other.
 *
 * The one deliberate difference is what the down arrow means here. The header
 * has nothing below it, so the arrows open the suggestions; this page has the
 * results themselves, so once the suggestions are closed the arrow keeps going
 * down into them.
 */
export default function SearchPageForm({
  initialQuery,
  filters,
  viewerAccountId = null,
}: {
  initialQuery: string;
  /** Kept across a new search, so what you turned off survives the next query. */
  filters: SearchFilters;
  viewerAccountId?: string | null;
}) {
  const cbx = useSearchCombobox({
    initialValue: initialQuery,
    openOnFocus: false,
    resultsHref: (query) => searchResultsHref(query, filters),
    onArrowOut: () => focusFirstSearchResult(),
  });

  const command = parseSearchCommand(cbx.typed);
  const radicalPicker = command ? (
    <RadicalSearchPanel chosen={command.radicals} onChange={(next) => cbx.setQuery(formatRadicalCommand(next))} />
  ) : null;

  return (
    <SearchComboboxField
      cbx={cbx}
      size="page"
      inputId={SEARCH_PAGE_INPUT_ID}
      listboxId={LISTBOX_ID}
      autoFocus={initialQuery.length === 0}
    >
      {cbx.showRecent ? (
        <div
          className={`absolute inset-x-0 top-[calc(100%+0.5rem)] ${MODAL_LAYERS.searchSuggest} overflow-hidden rounded-2xl border border-line bg-surface shadow-lg empty:hidden`}
        >
          <RecentItems currentQuery="" variant="panel" />
          <SearchCommandHint />
        </div>
      ) : null}

      {cbx.panelVisible ? (
        <div
          className={`absolute inset-x-0 top-[calc(100%+0.5rem)] ${MODAL_LAYERS.searchSuggest} overflow-hidden rounded-2xl border border-line bg-surface shadow-lg`}
        >
          <GlobalSearchSuggestList
            header={radicalPicker}
            suppressEmpty={Boolean(command) && command!.radicals.length === 0}
            listboxId={LISTBOX_ID}
            hits={cbx.hits}
        answers={cbx.answers}
            totalHits={cbx.totalHits}
            searching={cbx.searching}
            activeIndex={cbx.activeOption}
            onPick={cbx.pick}
            onHover={cbx.hover}
            onNearEnd={cbx.loadMore}
            loadingMore={cbx.loadingMore}
            accountId={viewerAccountId}
          />
        </div>
      ) : null}
    </SearchComboboxField>
  );
}
