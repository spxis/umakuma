"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";

/**
 * The header's way into search.
 *
 * Search lived only inside each explorer, filtering the page you were already
 * on. That cannot answer "where does this live", so this sits in the chrome and
 * goes to the results page instead of filtering anything in place.
 *
 * It used to be a 96px field that grew to 160px on focus, wedged between the
 * navigation and the codename, which is not enough room to read back what you
 * typed. It gets real width now, and the things that were crowding it moved to
 * the row below.
 *
 * On a phone it collapses to the icon alone, which opens a full-width field
 * under the header - the pattern WaniKani uses, and most sites with a narrow
 * header. An always-present input there cost about 150px, and the mobile nav
 * clips rather than wraps, so the field silently pushed Admin off the row.
 */
export default function GlobalSearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const mobileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) mobileInput.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/search?query=${encodeURIComponent(query)}`);
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
          className="absolute inset-x-0 top-full z-30 border-b border-line bg-surface px-4 py-2 shadow-sm sm:hidden"
        >
          <label className="sr-only" htmlFor="global-search-mobile">
            {SEARCH_PAGE_COPY.heading}
          </label>
          <div className="flex h-10 items-center rounded-full border border-line bg-surface-muted px-3 focus-within:ring-2 focus-within:ring-accent/30">
            <SearchIcon />
            <input
              ref={mobileInput}
              id="global-search-mobile"
              type="search"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={SEARCH_PAGE_COPY.heading}
              className="h-full w-full min-w-0 bg-transparent px-2 text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40"
            />
          </div>
        </form>
      ) : null}

      {/* Desktop: a field wide enough to read what you typed. */}
      <form onSubmit={submit} role="search" className={`hidden items-center sm:flex ${className}`.trim()}>
        <label className="sr-only" htmlFor="global-search">
          {SEARCH_PAGE_COPY.heading}
        </label>
        <div className="flex h-9 w-56 items-center rounded-full border border-line bg-surface pl-3 pr-1 transition focus-within:ring-2 focus-within:ring-accent/30 md:w-64 lg:w-80">
          <SearchIcon />
          <input
            id="global-search"
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={SEARCH_PAGE_COPY.heading}
            className="h-full w-full min-w-0 bg-transparent px-2 text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40"
          />
        </div>
      </form>
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
