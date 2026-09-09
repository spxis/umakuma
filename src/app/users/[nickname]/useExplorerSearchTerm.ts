"use client";

import { useEffect, useState } from "react";

import { readExplorerSearch } from "@/lib/explorerSearchParam";

/**
 * The search the page is currently obeying, read from the address.
 *
 * Not the text in the search box: that is what somebody is typing, and it means
 * nothing until it is submitted. The address is what the results were built
 * from, so it is the only honest answer to "why am I seeing one of a hundred".
 *
 * Every explorer moves the search with `history.pushState` rather than a
 * navigation, so this listens for the two events that accompany it as well as
 * for the back button. `useSearchParams` would mostly work - Next syncs it with
 * patched history methods - but it would also make every caller a Suspense
 * boundary, and the events are already there.
 */
export function useExplorerSearchTerm(): string {
  const [term, setTerm] = useState("");

  useEffect(() => {
    const read = () => {
      setTerm(readExplorerSearch(new URLSearchParams(window.location.search)));
    };

    read();
    window.addEventListener("popstate", read);
    window.addEventListener("wr:explorer-search", read);
    window.addEventListener("wr:explorer-search-clear", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("wr:explorer-search", read);
      window.removeEventListener("wr:explorer-search-clear", read);
    };
  }, []);

  return term;
}
