"use client";

import type { ReactNode, RefObject } from "react";

import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import type { SearchCombobox } from "@/lib/useSearchCombobox";
import { suggestOptionId } from "./GlobalSearchSuggestList";

/**
 * Every size a search box comes in shares one anatomy: ghost text behind a
 * transparent input, a clear button once there is something to clear, and the
 * magnifier on the right as the submit - Jisho's arrangement, which every
 * member of the audience already knows how to read.
 */
const FIELD_SIZES = {
  header: {
    shell: "flex h-9 items-center rounded-full border border-line bg-surface pl-3 pr-1 transition focus-within:ring-2 focus-within:ring-accent/30",
    text: "px-2 text-sm font-semibold",
  },
  sheet: {
    shell: "flex h-10 items-center rounded-full border border-line bg-surface-muted px-2 focus-within:ring-2 focus-within:ring-accent/30",
    text: "px-2 text-sm font-semibold",
  },
  page: {
    shell: "flex h-11 items-center rounded-full border border-line bg-surface pl-4 pr-1 transition focus-within:ring-2 focus-within:ring-accent/40",
    text: "px-1 text-base font-semibold",
  },
} as const;

type Props = {
  cbx: SearchCombobox;
  inputId: string;
  listboxId: string;
  size: keyof typeof FIELD_SIZES;
  /** Shorter in the header, where the collapsed field is a third as wide. */
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  /** The suggestion panel, positioned by the caller, kept inside the blur boundary. */
  children?: ReactNode;
  /**
   * A row directly under the input, in the layout rather than in the panel.
   *
   * The commands live here on a surface whose panel does not open on focus:
   * the results page keeps its dropdown shut so a seeded query cannot cover
   * the results it just produced, which would leave a row inside that panel
   * permanently invisible.
   */
  belowField?: ReactNode;
};

export default function SearchComboboxField({
  cbx,
  inputId,
  listboxId,
  size,
  placeholder = SEARCH_PAGE_COPY.placeholder,
  inputRef,
  autoFocus = false,
  children,
  belowField,
}: Props) {
  const sizing = FIELD_SIZES[size];

  return (
    <div className="relative" onBlur={cbx.onBlur}>
      <form onSubmit={cbx.submit} role="search">
        <label className="sr-only" htmlFor={inputId}>
          {SEARCH_PAGE_COPY.heading}
        </label>
        <div className={sizing.shell}>
          <div className="relative h-full min-w-0 flex-1">
            {cbx.ghost ? (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre ${sizing.text}`}
              >
                <span className="invisible">{cbx.displayValue}</span>
                <span className="text-foreground/35">{cbx.ghost}</span>
              </div>
            ) : null}
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              autoFocus={autoFocus}
              placeholder={placeholder}
              aria-activedescendant={
                cbx.activeOption >= 0 ? suggestOptionId(listboxId, cbx.activeOption) : undefined
              }
              className={`relative h-full w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-foreground/60 [&::-webkit-search-cancel-button]:hidden ${sizing.text}`}
              {...cbx.inputProps(listboxId)}
            />
          </div>

          {cbx.displayValue ? (
            <button
              type="button"
              aria-label={SEARCH_PAGE_COPY.clear}
              onMouseDown={(event) => event.preventDefault()}
              onClick={cbx.clear}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground/60 transition hover:bg-surface-muted hover:text-foreground"
            >
              <ClearIcon />
            </button>
          ) : null}

          <button
            type="submit"
            aria-label={SEARCH_PAGE_COPY.submit}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/60 transition hover:bg-surface-muted hover:text-foreground"
          >
            <SearchIcon />
          </button>
        </div>
      </form>
      {belowField}
      {children}
    </div>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current opacity-70">
      <path d="M8.5 3a5.5 5.5 0 1 0 3.39 9.83l3.14 3.14a1 1 0 0 0 1.42-1.42l-3.14-3.14A5.5 5.5 0 0 0 8.5 3Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current">
      <path d="M5.28 3.86 10 8.59l4.72-4.73a1 1 0 0 1 1.42 1.42L11.41 10l4.73 4.72a1 1 0 0 1-1.42 1.42L10 11.41l-4.72 4.73a1 1 0 0 1-1.42-1.42L8.59 10 3.86 5.28a1 1 0 0 1 1.42-1.42Z" />
    </svg>
  );
}
