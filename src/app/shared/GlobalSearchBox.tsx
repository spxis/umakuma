"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";

/**
 * The header's way into search.
 *
 * Search lived only inside each explorer, filtering the page you were already
 * on. That cannot answer "where does this live", so this sits in the chrome and
 * goes to the results page instead of filtering anything in place.
 */
export default function GlobalSearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (query) {
      router.push(`/search?query=${encodeURIComponent(query)}`);
    }
  }

  return (
    <form onSubmit={submit} role="search" className={`flex items-center ${className}`.trim()}>
      <label className="sr-only" htmlFor="global-search">
        {SEARCH_PAGE_COPY.heading}
      </label>
      <div className="flex h-8 items-center rounded-full border border-line bg-surface pl-2.5 pr-1 transition focus-within:ring-2 focus-within:ring-accent/30">
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-foreground/40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" />
          <path d="M13.5 13.5 17 17" />
        </svg>
        <input
          id="global-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={SEARCH_PAGE_COPY.heading}
          className="h-full w-24 min-w-0 bg-transparent px-2 text-xs font-semibold text-foreground outline-none placeholder:text-foreground/40 focus:w-36 sm:w-28 sm:focus:w-48"
        />
      </div>
    </form>
  );
}
