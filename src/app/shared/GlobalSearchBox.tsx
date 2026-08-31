"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from "react";

import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import { isSuggestable, suggestionHref } from "@/lib/globalSearchSuggest";
import { useSearchSuggestions } from "@/lib/useSearchSuggestions";
import GlobalSearchSuggestList, { suggestOptionId } from "./GlobalSearchSuggestList";
import { MODAL_LAYERS } from "./modalLayers";

/**
 * The header's way into search.
 *
 * Search lived only inside each explorer, filtering the page you were already
 * on. That cannot answer "where does this live", so this sits in the chrome and
 * goes to the results page instead of filtering anything in place.
 *
 * It answers while you type: the ten best hits appear under the field, one row
 * per glyph, and Enter still submits to the full results page when nothing is
 * highlighted. Focus never leaves the input - the arrows move a highlight
 * through the options and Enter picks, the combobox pattern - because moving
 * focus into the list would close the phone keyboard mid-thought.
 *
 * On a phone it collapses to the icon alone, which opens a full-width field
 * under the header - the pattern WaniKani uses, and most sites with a narrow
 * header.
 */
export default function GlobalSearchBox({
  className = "",
  viewerUsername = null,
}: {
  className?: string;
  /** Whose explorers a picked suggestion opens; null when nobody is signed in. */
  viewerUsername?: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const mobileInput = useRef<HTMLInputElement>(null);

  const suggestions = useSearchSuggestions(value);
  const panelVisible = suggestOpen && isSuggestable(value);
  /** The hit rows plus the see-all footer; nothing to walk while empty. */
  const optionCount = suggestions.hits.length > 0 ? suggestions.hits.length + 1 : 0;
  /* Derived, not synced: a shrinking result set drops the highlight cleanly. */
  const activeOption = activeIndex >= optionCount ? -1 : activeIndex;

  useEffect(() => {
    if (open) mobileInput.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeSuggestions() {
    setSuggestOpen(false);
    setActiveIndex(-1);
  }

  function pick(index: number) {
    const query = value.trim();
    const hit = suggestions.hits[index];
    const href =
      hit === undefined
        ? `/search?query=${encodeURIComponent(query)}`
        : suggestionHref(hit, viewerUsername);
    closeSuggestions();
    setOpen(false);
    router.push(href);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    closeSuggestions();
    setOpen(false);
    router.push(`/search?query=${encodeURIComponent(query)}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!panelVisible) {
        setSuggestOpen(true);
        return;
      }
      if (optionCount === 0) return;
      setActiveIndex((index) => {
        const current = index >= optionCount ? -1 : index;
        if (event.key === "ArrowDown") return current >= optionCount - 1 ? 0 : current + 1;
        return current <= 0 ? optionCount - 1 : current - 1;
      });
      return;
    }

    if (event.key === "Enter" && panelVisible && activeOption >= 0) {
      event.preventDefault();
      pick(activeOption);
      return;
    }

    /* Stopped so the phone sheet's window listener keeps the sheet open. */
    if (event.key === "Escape" && panelVisible) {
      event.preventDefault();
      event.stopPropagation();
      closeSuggestions();
    }
  }

  /** Closes the dropdown only when focus truly leaves the field and its list. */
  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeSuggestions();
    }
  }

  function comboboxProps(listboxId: string) {
    return {
      role: "combobox" as const,
      "aria-expanded": panelVisible,
      "aria-controls": listboxId,
      "aria-activedescendant": activeOption >= 0 ? suggestOptionId(listboxId, activeOption) : undefined,
      "aria-autocomplete": "list" as const,
      autoComplete: "off",
      value,
      onChange: (event: FormEvent<HTMLInputElement>) => {
        setValue(event.currentTarget.value);
        setSuggestOpen(true);
        setActiveIndex(-1);
      },
      onFocus: () => setSuggestOpen(true),
      onKeyDown,
    };
  }

  function suggestList(listboxId: string) {
    return (
      <GlobalSearchSuggestList
        listboxId={listboxId}
        hits={suggestions.hits}
        totalHits={suggestions.totalHits}
        searching={suggestions.searching}
        activeIndex={activeOption}
        onPick={pick}
        onHover={setActiveIndex}
      />
    );
  }

  return (
    <>
      {/* Phone: the icon, and the field it opens below the header. */}
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-label={SEARCH_PAGE_COPY.heading}
        aria-expanded={open}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-foreground/60 transition hover:text-foreground sm:hidden ${className}`.trim()}
      >
        <SearchIcon />
      </button>

      {open ? (
        <form
          onSubmit={submit}
          role="search"
          className={`absolute inset-x-0 top-full ${MODAL_LAYERS.searchSheet} border-b border-line bg-surface px-4 py-2 shadow-sm sm:hidden`}
        >
          <div onBlur={onBlur}>
            <label className="sr-only" htmlFor="global-search-mobile">
              {SEARCH_PAGE_COPY.heading}
            </label>
            <div className="flex h-10 items-center rounded-full border border-line bg-surface-muted px-3 focus-within:ring-2 focus-within:ring-accent/30">
              <SearchIcon />
              <input
                ref={mobileInput}
                id="global-search-mobile"
                type="search"
                placeholder={SEARCH_PAGE_COPY.heading}
                className="h-full w-full min-w-0 bg-transparent px-2 text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40"
                {...comboboxProps("global-search-suggest-mobile")}
              />
            </div>
            {panelVisible ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
                {suggestList("global-search-suggest-mobile")}
              </div>
            ) : null}
          </div>
        </form>
      ) : null}

      {/* Desktop: a field wide enough to read what you typed. */}
      <div className={`relative hidden sm:block ${className}`.trim()} onBlur={onBlur}>
        <form onSubmit={submit} role="search" className="flex items-center">
          <label className="sr-only" htmlFor="global-search">
            {SEARCH_PAGE_COPY.heading}
          </label>
          <div className="flex h-9 w-56 items-center rounded-full border border-line bg-surface pl-3 pr-1 transition focus-within:ring-2 focus-within:ring-accent/30 md:w-64 lg:w-80">
            <SearchIcon />
            <input
              id="global-search"
              type="search"
              placeholder={SEARCH_PAGE_COPY.heading}
              className="h-full w-full min-w-0 bg-transparent px-2 text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40"
              {...comboboxProps("global-search-suggest-desktop")}
            />
          </div>
        </form>
        {panelVisible ? (
          <div
            className={`absolute left-0 top-[calc(100%+0.5rem)] sm:left-auto sm:right-0 ${MODAL_LAYERS.searchSuggest} w-104 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg`}
          >
            {suggestList("global-search-suggest-desktop")}
          </div>
        ) : null}
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current opacity-70">
      <path d="M8.5 3a5.5 5.5 0 1 0 3.39 9.83l3.14 3.14a1 1 0 0 0 1.42-1.42l-3.14-3.14A5.5 5.5 0 0 0 8.5 3Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
    </svg>
  );
}
