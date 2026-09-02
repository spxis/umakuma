"use client";

import { useRouter } from "next/navigation";
import { useState, type FocusEvent, type FormEvent, type KeyboardEvent } from "react";

import { searchSubmitHref, type SearchHit } from "./globalSearch";
import { rememberHit } from "./recentItems";
import { isSearchCommand } from "./searchCommands";
import {
  SUGGEST_LOAD_LEAD,
  SUGGEST_MAX_PAGES,
  ghostFor,
  isSuggestable,
  suggestRows,
  suggestionHref,
} from "./globalSearchSuggest";
import { useSearchSuggestions } from "./useSearchSuggestions";

export type SearchComboboxOptions = {
  /** What the box starts with, for a results page that already ran a search. */
  initialValue?: string;
  /** Reopen the panel on focus and on arrow keys (the header box wants this). */
  openOnFocus?: boolean;
  /** Where a submitted query goes; the results page keeps its source filter. */
  resultsHref?: (query: string) => string;
  /** ArrowDown with the panel closed hands off, e.g. into the results list. */
  onArrowOut?: () => void;
  /** Called after a suggestion or submit navigates, e.g. to close a sheet. */
  onNavigate?: () => void;
};

function defaultResultsHref(query: string): string {
  return `/search?query=${encodeURIComponent(query)}`;
}

/**
 * The search box state machine, shared by the header and the search page.
 *
 * Two values, on purpose. What the member *typed* drives the (debounced)
 * suggestion fetch and never changes when they arrow through the list; what
 * the box *displays* follows the highlighted row and snaps back on Escape.
 * That split is what lets the input show 家 while the request cache still
 * keys on "house" - browsing suggestions costs zero extra searches.
 *
 * The ghost is the rest of the top hit's matching field, drawn in faint grey
 * after the caret. Enter accepts it into the box as if typed - it does not
 * submit, since the member has not asked for that word's results yet.
 */
export function useSearchCombobox({
  initialValue = "",
  openOnFocus = true,
  resultsHref = defaultResultsHref,
  onArrowOut,
  onNavigate,
}: SearchComboboxOptions) {
  const router = useRouter();
  const [typed, setTyped] = useState(initialValue);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /*
   * The results page seeds the box with the query it just ran, and suggesting
   * against that value would spend a request restating what the page already
   * shows. Nothing is fetched until the member types.
   */
  const [typing, setTyping] = useState(false);
  /* How many stretches of the answer the dropdown is currently holding. */
  const [pages, setPages] = useState(1);

  const suggestions = useSearchSuggestions(typing ? typed : "", suggestRows(pages));
  const canLoadMore = pages < SUGGEST_MAX_PAGES && suggestions.hasMore;

  /** Asks for the next stretch; harmless to call again while one is in flight. */
  function loadMore() {
    if (canLoadMore) setPages((count) => count + 1);
  }
  const panelVisible = suggestOpen && isSuggestable(typed);
  /*
   * Nothing typed, but the box is open: the panel has the searches you already
   * ran to offer. They were on the search page and not in the header, which
   * made the same box behave differently in two places.
   */
  const showRecent = suggestOpen && !isSuggestable(typed);
  const optionCount = suggestions.hits.length > 0 ? suggestions.hits.length + 1 : 0;
  const activeOption = activeIndex >= optionCount ? -1 : activeIndex;

  const activeHit: SearchHit | undefined =
    activeOption >= 0 ? suggestions.hits[activeOption] : undefined;
  const displayValue = activeHit ? activeHit.glyph : typed;
  const ghost = panelVisible && activeOption === -1 ? ghostFor(typed, suggestions.hits) : null;

  function closePanel() {
    setSuggestOpen(false);
    setActiveIndex(-1);
  }

  function navigate(href: string) {
    closePanel();
    onNavigate?.();
    router.push(href);
  }

  function pick(index: number) {
    const hit = suggestions.hits[index];
    if (hit === undefined) {
      navigate(resultsHref(typed.trim()));
      return;
    }

    /* The dropdown opens subjects too, so it fills the same history the rows do. */
    rememberHit(hit);
    navigate(suggestionHref(hit));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(searchSubmitHref(typed, resultsHref));
  }

  function acceptGhost(completion: string) {
    setTyped(typed + completion);
    setActiveIndex(-1);
  }

  function clear() {
    setTyped("");
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!panelVisible) {
        if (openOnFocus && isSuggestable(typed)) {
          event.preventDefault();
          setSuggestOpen(true);
        } else if (event.key === "ArrowDown" && onArrowOut) {
          event.preventDefault();
          onArrowOut();
        }
        return;
      }
      event.preventDefault();
      if (optionCount === 0) return;
      const next =
        event.key === "ArrowDown"
          ? activeOption >= optionCount - 1
            ? 0
            : activeOption + 1
          : activeOption <= 0
            ? optionCount - 1
            : activeOption - 1;
      setActiveIndex(next);
      /* Fetch the next stretch before the highlight reaches the end of this one. */
      if (next >= suggestions.hits.length - SUGGEST_LOAD_LEAD) loadMore();
      return;
    }

    if (event.key === "Enter") {
      if (panelVisible && activeOption >= 0) {
        event.preventDefault();
        pick(activeOption);
      } else if (ghost) {
        /* Locks the completed word in as if typed; searching waits for the next Enter. */
        event.preventDefault();
        acceptGhost(ghost);
      }
      return;
    }

    if (event.key === "Tab" && ghost) {
      event.preventDefault();
      acceptGhost(ghost);
      return;
    }

    /*
     * Escape empties the box before it closes it.
     *
     * One key, two things to undo: the query that is in the way and the panel
     * over the page. Closing first leaves the box still full, so the next
     * focus reopens the same search somebody was trying to leave - and a
     * command, which is long and typed by a control rather than by hand, is
     * exactly what a member reaches for Escape to be rid of.
     *
     * The panel that is open after the clear is the recent items rather than
     * the suggestions, and leaving it out of this condition is what made the
     * second press do nothing at all.
     *
     * Stopped so a phone sheet's own Escape listener keeps the sheet open on
     * the press that clears.
     */
    if (event.key === "Escape" && (panelVisible || showRecent || typed.length > 0)) {
      event.preventDefault();
      event.stopPropagation();
      if (typed.length > 0) clear();
      else closePanel();
    }
  }

  /** Closes the dropdown only when focus truly leaves the field and its list. */
  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closePanel();
    }
  }

  function inputProps(listboxId: string) {
    return {
      role: "combobox" as const,
      "aria-expanded": panelVisible,
      "aria-controls": listboxId,
      "aria-autocomplete": "both" as const,
      autoComplete: "off",
      value: displayValue,
      onChange: (event: FormEvent<HTMLInputElement>) => {
        setTyped(event.currentTarget.value);
        setTyping(true);
        setSuggestOpen(true);
        setActiveIndex(-1);
        /* A new query is a new list; it starts at one stretch again. */
        setPages(1);
      },
      onFocus: () => {
        /*
         * A command in the box is the picker's own state, so focusing the box
         * has to bring the picker back - the results page keeps the panel shut
         * on focus, which is right for a seeded query and wrong for a command,
         * where the box and the panel are two halves of one control. `typing`
         * goes on with it, or the picker would come back over an empty answer
         * until a key was pressed.
         */
        const command = isSearchCommand(typed);
        if (openOnFocus || command) setSuggestOpen(true);
        if (command) setTyping(true);
      },
      onKeyDown,
    };
  }

  return {
    typed,
    displayValue,
    ghost,
    panelVisible,
    showRecent,
    activeOption,
    hits: suggestions.hits,
    answers: suggestions.answers,
    totalHits: suggestions.totalHits,
    searching: suggestions.searching,
    inputProps,
    onBlur,
    submit,
    pick,
    hover: setActiveIndex,
    clear,
    /*
     * Writing the query from outside the field. The radical picker edits the
     * command in the box rather than holding a selection of its own, so the
     * box is always what is being asked and the picker has no second state to
     * fall out of step with it. `typing` goes on, or the seeded results page
     * would leave the new command unfetched.
     */
    setQuery: (next: string) => {
      setTyping(true);
      setSuggestOpen(true);
      setActiveIndex(-1);
      setTyped(next);
    },
    loadMore,
    loadingMore: suggestions.loadingMore,
  };
}

export type SearchCombobox = ReturnType<typeof useSearchCombobox>;
