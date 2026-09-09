"use client";

import { clearExplorerSearch } from "@/lib/explorerSearchParam";
import { EXPLORER_SEARCH_SCOPES } from "./explorerSearchDomain";

/**
 * Take the search off this page: out of the address, then out of every reader.
 *
 * The search bar had this inline and was the only thing that could do it, which
 * is why a search could only be cleared from the box that set it - and the box
 * lives inside a filter panel that is shut by default on a phone. Anything that
 * shows a member their search is now also able to end it.
 */
export function clearExplorerSearchNow(): void {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  clearExplorerSearch(params);
  const query = params.toString();
  window.history.pushState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}#explorer`);

  window.dispatchEvent(
    new CustomEvent("wr:explorer-search-clear", {
      detail: { scope: EXPLORER_SEARCH_SCOPES.all },
    }),
  );
}
