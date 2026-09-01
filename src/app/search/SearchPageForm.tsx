"use client";

import GlobalSearchSuggestList from "@/app/shared/GlobalSearchSuggestList";
import RecentItems from "@/app/shared/RecentItems";
import SearchComboboxField from "@/app/shared/SearchComboboxField";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import type { SearchSource } from "@/lib/globalSearch";
import { useSearchCombobox } from "@/lib/useSearchCombobox";

import { SEARCH_PAGE_INPUT_ID, focusSearchResultRow } from "./searchFocus";

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
  activeSource,
}: {
  initialQuery: string;
  /** Kept across a new search, so the source filter survives the next query. */
  activeSource: SearchSource | null;
}) {
  const cbx = useSearchCombobox({
    initialValue: initialQuery,
    openOnFocus: false,
    resultsHref: (query) => {
      const params = new URLSearchParams({ query });
      if (activeSource) params.set("in", activeSource);
      return `/search?${params.toString()}`;
    },
    onArrowOut: () => focusSearchResultRow(0),
  });

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
        </div>
      ) : null}

      {cbx.panelVisible ? (
        <div
          className={`absolute inset-x-0 top-[calc(100%+0.5rem)] ${MODAL_LAYERS.searchSuggest} overflow-hidden rounded-2xl border border-line bg-surface shadow-lg`}
        >
          <GlobalSearchSuggestList
            listboxId={LISTBOX_ID}
            hits={cbx.hits}
            totalHits={cbx.totalHits}
            searching={cbx.searching}
            activeIndex={cbx.activeOption}
            onPick={cbx.pick}
            onHover={cbx.hover}
            onNearEnd={cbx.loadMore}
            loadingMore={cbx.loadingMore}
          />
        </div>
      ) : null}
    </SearchComboboxField>
  );
}
