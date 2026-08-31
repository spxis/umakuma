"use client";

import { useRouter } from "next/navigation";
import { useState, type FocusEvent, type FormEvent, type KeyboardEvent } from "react";

import type { SearchHit } from "./globalSearch";
import { ghostFor, isSuggestable, suggestionHref } from "./globalSearchSuggest";
import { useSearchSuggestions } from "./useSearchSuggestions";

export type SearchComboboxOptions = {
  /** Whose explorers a picked suggestion opens; null when nobody is signed in. */
  viewerUsername: string | null;
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
  viewerUsername,
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

  const suggestions = useSearchSuggestions(typing ? typed : "");
  const panelVisible = suggestOpen && isSuggestable(typed);
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
    navigate(hit === undefined ? resultsHref(typed.trim()) : suggestionHref(hit, viewerUsername));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = typed.trim();
    if (!query) return;
    navigate(resultsHref(query));
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
      setActiveIndex((index) => {
        const current = index >= optionCount ? -1 : index;
        if (event.key === "ArrowDown") return current >= optionCount - 1 ? 0 : current + 1;
        return current <= 0 ? optionCount - 1 : current - 1;
      });
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

    /* Stopped so a phone sheet's own Escape listener keeps the sheet open. */
    if (event.key === "Escape" && panelVisible) {
      event.preventDefault();
      event.stopPropagation();
      closePanel();
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
      },
      onFocus: () => {
        if (openOnFocus) setSuggestOpen(true);
      },
      onKeyDown,
    };
  }

  return {
    typed,
    displayValue,
    ghost,
    panelVisible,
    activeOption,
    hits: suggestions.hits,
    totalHits: suggestions.totalHits,
    searching: suggestions.searching,
    inputProps,
    onBlur,
    submit,
    pick,
    hover: setActiveIndex,
    clear,
  };
}

export type SearchCombobox = ReturnType<typeof useSearchCombobox>;
