"use client";

import { FormEvent, useState } from "react";

export default function ExplorerSearchBar() {
  const [query, setQuery] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (typeof window === "undefined") {
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("find", trimmed);

    const next = `${window.location.pathname}?${params.toString()}#explorer`;
    window.history.pushState(null, "", next);

    window.dispatchEvent(
      new CustomEvent("wr:explorer-search", {
        detail: { query: trimmed },
      }),
    );
  }

  return (
    <form onSubmit={submitSearch} className="w-full">
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-line bg-surface px-2 py-1">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search kanji, hiragana, or romaji"
          className="h-9 min-w-0 flex-1 rounded-full bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-500"
          aria-label="Search level explorer"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-full border border-accent bg-accent px-4 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-95"
        >
          Search
        </button>
      </div>
    </form>
  );
}
