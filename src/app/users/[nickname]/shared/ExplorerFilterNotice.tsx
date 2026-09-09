import { NO_TRANSLATE_CLASS } from "@/app/shared/japaneseText";

import { EXPLORER_RESULT_COPY } from "./explorerResultCopy";

type ExplorerFilterNoticeProps = {
  /** What is narrowing the list, in the member's words: "Trouble only", "Search: 海". */
  label: string;
  /** Why this is here and what selecting it does. Also the accessible name. */
  hint: string;
  onClear: () => void;
};

/*
 * A filter that is on, said out loud, with the way off attached.
 *
 * The Trouble/Favourites filter had this first, for the reason its own notice
 * recorded: it was "a filter with no visible handle - the Reviews badge counts
 * every due assignment while the queue shows only the tagged slice". A text
 * search is the same failure one filter along, and it was worse, because the
 * search box that set it sits inside a filter panel that is shut by default,
 * so "Showing 1 of 100 items" was the only thing on screen and it named no
 * cause. Two chips of the same amber, so one component draws both.
 *
 * It belongs beside what it narrowed, never inside the collapsible panel: a
 * notice a member has to open a panel to read cannot explain a shut panel.
 */
export default function ExplorerFilterNotice({ label, hint, onClear }: ExplorerFilterNoticeProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      title={hint}
      className="inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-100 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800 transition hover:bg-amber-200 sm:h-8 sm:text-xs"
    >
      <span translate="no" className={`${NO_TRANSLATE_CLASS} truncate`}>{label}</span>
      <span aria-hidden="true" className="text-sm leading-none">&times;</span>
      <span className="sr-only">{hint}</span>
    </button>
  );
}

type ExplorerSearchNoticeProps = {
  term: string;
  onClear: () => void;
};

/** The search chip: nothing at all when no search is running. */
export function ExplorerSearchNotice({ term, onClear }: ExplorerSearchNoticeProps) {
  if (!term) {
    return null;
  }

  return (
    <ExplorerFilterNotice
      label={EXPLORER_RESULT_COPY.searchChipLabel(term)}
      hint={EXPLORER_RESULT_COPY.searchChipHint}
      onClear={onClear}
    />
  );
}
