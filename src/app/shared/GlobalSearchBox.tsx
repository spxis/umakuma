"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";

import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import { useSearchCombobox } from "@/lib/useSearchCombobox";
import GlobalSearchSuggestList from "./GlobalSearchSuggestList";
import SearchComboboxField, { SearchIcon } from "./SearchComboboxField";
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
 * At rest the field is half its working width. The header is a navigation row
 * first, and a search box wide enough to read a sentence in dominates it; the
 * width is only wanted once someone is actually typing, so it arrives then and
 * stays while there is a query to read back.
 *
 * On a phone it collapses to the icon alone, which opens a full-width field
 * under the header - the pattern WaniKani uses, and most sites with a narrow
 * header.
 */
const DESKTOP_LISTBOX = "global-search-suggest-desktop";
const MOBILE_LISTBOX = "global-search-suggest-mobile";

export default function GlobalSearchBox({
  className = "",
  viewerUsername = null,
}: {
  className?: string;
  /** Whose explorers a picked suggestion opens; null when nobody is signed in. */
  viewerUsername?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const mobileInput = useRef<HTMLInputElement>(null);

  const cbx = useSearchCombobox({
    viewerUsername,
    onNavigate: () => setOpen(false),
  });

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

  function suggestList(listboxId: string) {
    return (
      <GlobalSearchSuggestList
        listboxId={listboxId}
        hits={cbx.hits}
        totalHits={cbx.totalHits}
        searching={cbx.searching}
        activeIndex={cbx.activeOption}
        onPick={cbx.pick}
        onHover={cbx.hover}
        onNearEnd={cbx.loadMore}
        loadingMore={cbx.loadingMore}
      />
    );
  }

  /** Wide while it is being used, and while it still holds a query to read. */
  const expanded = focused || cbx.displayValue.length > 0;

  function trackFocus(event: FocusEvent<HTMLDivElement>) {
    setFocused(event.type === "focus" || event.currentTarget.contains(event.relatedTarget));
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
        <div
          className={`absolute inset-x-0 top-full ${MODAL_LAYERS.searchSheet} border-b border-line bg-surface px-4 py-2 shadow-sm sm:hidden`}
        >
          <SearchComboboxField
            cbx={cbx}
            size="sheet"
            inputId="global-search-mobile"
            listboxId={MOBILE_LISTBOX}
            placeholder={SEARCH_PAGE_COPY.heading}
            inputRef={mobileInput}
          >
            {cbx.panelVisible ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
                {suggestList(MOBILE_LISTBOX)}
              </div>
            ) : null}
          </SearchComboboxField>
        </div>
      ) : null}

      {/* Desktop: half a field until it is wanted. */}
      <div
        className={`hidden sm:block ${className}`.trim()}
        onFocus={trackFocus}
        onBlur={trackFocus}
      >
        <div
          className={`transition-[width] duration-200 ease-out ${
            expanded ? "w-64 md:w-80 lg:w-104" : "w-32 md:w-40"
          }`}
        >
          <SearchComboboxField
            cbx={cbx}
            size="header"
            inputId="global-search"
            listboxId={DESKTOP_LISTBOX}
            placeholder={SEARCH_PAGE_COPY.heading}
          >
            {cbx.panelVisible ? (
              <div
                className={`absolute left-0 top-[calc(100%+0.5rem)] sm:left-auto sm:right-0 ${MODAL_LAYERS.searchSuggest} w-104 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg`}
              >
                {suggestList(DESKTOP_LISTBOX)}
              </div>
            ) : null}
          </SearchComboboxField>
        </div>
      </div>
    </>
  );
}
