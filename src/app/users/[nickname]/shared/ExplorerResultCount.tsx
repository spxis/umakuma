"use client";

import { formatNumber } from "../level-explorer/lib/levelExplorerDisplayDates";
import { clearExplorerSearchNow } from "../explorerSearchActions";
import { useExplorerSearchTerm } from "../useExplorerSearchTerm";
import { ExplorerSearchNotice } from "./ExplorerFilterNotice";
import { EXPLORER_RESULT_COPY, explorerShowingText } from "./explorerResultCopy";

type ExplorerResultCountProps = {
  /** How many are on screen. */
  visible: number;
  /** How many there would be without the narrowing. */
  total: number;
  /** What is being counted. Items on the study and level explorers, results on JLPT. */
  noun?: string;
  className?: string;
};

/**
 * The one line that says how much of the list you are looking at, and why.
 *
 * Three explorers carry the same search bar and each wrote this line its own
 * way: "Showing 1/100 items", "Showing 5 of 40 results", and "Showing 5 of 5
 * search results" - the last of which at least changed its noun when a search
 * was running, while the other two said nothing at all. So a member with a
 * forgotten search read "Showing 1 of 100 items" and had every reason to think
 * ninety-nine reviews had gone missing. The search box that would have
 * explained it sits inside a filter panel that is shut by default.
 *
 * The count keeps its meaning - the total is still the total, because knowing
 * how much is being hidden is the point - and the search that hid the rest is
 * named beside it, with the way out attached to it.
 */
export default function ExplorerResultCount({
  visible,
  total,
  noun = EXPLORER_RESULT_COPY.itemsNoun,
  className = "",
}: ExplorerResultCountProps) {
  const searchTerm = useExplorerSearchTerm();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
        {explorerShowingText(formatNumber(visible), formatNumber(total), noun)}
      </p>
      <ExplorerSearchNotice term={searchTerm} onClear={clearExplorerSearchNow} />
    </div>
  );
}
