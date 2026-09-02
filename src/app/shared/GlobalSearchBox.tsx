"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";

import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import { useSearchCombobox } from "@/lib/useSearchCombobox";
import GlobalSearchSuggestList from "./GlobalSearchSuggestList";
import RadicalPickerControls from "./RadicalPickerControls";
import RadicalPickerGrid from "./RadicalPickerGrid";
import SearchCommandBar from "./SearchCommandBar";
import { useRadicalPicker } from "./useRadicalPicker";
import RecentItems from "./RecentItems";
import SearchComboboxField, { SearchIcon } from "./SearchComboboxField";
import { MODAL_LAYERS } from "./modalLayers";
import { useFilerOpen } from "./useSubjectFiler";
import { formatRadicalCommand, parseSearchCommand } from "@/lib/searchCommands";

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
  viewerAccountId = null,
  onExpandedChange,
}: {
  className?: string;
  /** The viewer's own account, so results can be filed into their lists. */
  viewerAccountId?: string | null;
  /**
   * Whether the field is taking the room it needs.
   *
   * The header row has to answer for the whole width: an expanded box and a
   * row of section links cannot both fit on a narrow desktop, and the links
   * are what a member can do without, having typed into the box already.
   */
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filerOpen] = useFilerOpen();
  /* Room for the filing column: the dropdown grows, the field does not. */
  const filing = Boolean(viewerAccountId) && filerOpen;
  const [focused, setFocused] = useState(false);
  const mobileInput = useRef<HTMLInputElement>(null);

  const cbx = useSearchCombobox({
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

  /*
   * The picker is part of the answer panel rather than a window over the page:
   * it belongs under the box that holds the command it is editing, and the
   * matches run underneath it like any other search.
   */
  const command = parseSearchCommand(cbx.typed);
  const picker = useRadicalPicker(
    command?.radicals ?? [],
    (next) => cbx.setQuery(formatRadicalCommand(next)),
    Boolean(command),
  );
  /* One row of options; the picker takes it over while it is running. */
  const options = command ? <RadicalPickerControls picker={picker} /> : <SearchCommandBar onCommand={cbx.setQuery} />;
  const grid = command ? <RadicalPickerGrid picker={picker} /> : null;

  /* The grid needs the room the answer alone does not. */
  /* Only a floor: the panel takes the field's width, which is the row. */
  const panelWidth = filing || command ? "min-w-160" : "min-w-104";

  function suggestList(listboxId: string) {
    return (
      <GlobalSearchSuggestList
        options={options}
        grid={grid}
        suppressEmpty={Boolean(command) && command!.radicals.length === 0}
        listboxId={listboxId}
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
    );
  }

  /** Wide while it is being used, and while it still holds a query to read. */
  const expanded = focused || cbx.displayValue.length > 0;

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

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
            {cbx.panelVisible || cbx.showRecent ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface empty:hidden">
                {cbx.panelVisible ? (
                  suggestList(MOBILE_LISTBOX)
                ) : (
                  <>
                    <RecentItems currentQuery="" variant="panel" />
                    <SearchCommandBar onCommand={cbx.setQuery} />
                  </>
                )}
              </div>
            ) : null}
          </SearchComboboxField>
        </div>
      ) : null}

      {/* Desktop: half a field until it is wanted. */}
      <div
        className={`hidden min-w-0 sm:block ${expanded ? "flex-1" : ""} ${className}`.trim()}
        onFocus={trackFocus}
        onBlur={trackFocus}
      >
        <div
          className={`transition-[width] duration-200 ease-out ${expanded ? "w-full" : "w-28 md:w-32"}`}
        >
          <SearchComboboxField
            cbx={cbx}
            size="header"
            inputId="global-search"
            listboxId={DESKTOP_LISTBOX}
            placeholder={SEARCH_PAGE_COPY.heading}
          >
            {cbx.panelVisible || cbx.showRecent ? (
              <div
                /*
                 * As wide as the field it hangs from. A fixed width left the
                 * panel narrower than the open box, which looked like a second
                 * control and wrapped the options row onto two lines. It only
                 * ever shows while the box is open, so there is no narrow case
                 * to keep a minimum for.
                 */
                className={`absolute inset-x-0 top-[calc(100%+0.5rem)] ${MODAL_LAYERS.searchSuggest} ${panelWidth} max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg empty:hidden`}
              >
                {cbx.panelVisible ? (
                  suggestList(DESKTOP_LISTBOX)
                ) : (
                  <RecentItems currentQuery="" variant="panel" />
                )}
              </div>
            ) : null}
          </SearchComboboxField>
        </div>
      </div>
    </>
  );
}
