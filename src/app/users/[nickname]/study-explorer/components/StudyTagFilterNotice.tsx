import { studyTagFilterLabel } from "../../studyTagFilterState";
import type { StudyTagFilter } from "../lib/studyExplorerTypes";
import { STUDY_PANEL_TEXT } from "./StudyExplorer.constants";

type StudyTagFilterNoticeProps = {
  queueTagFilter: StudyTagFilter;
  onClear: () => void;
};

/*
 * The Trouble/Favourites filter is chosen in the queue dropdown, then kept in
 * localStorage and written back into the URL on every load. That made it a
 * filter with no visible handle: the Reviews badge counts every due assignment
 * while the queue shows only the tagged slice, and Clear all never reached it.
 * This sits in the always-visible header row, not inside the collapsible filter
 * panel, so the narrowing is still explained when the panel is shut.
 */
export default function StudyTagFilterNotice({ queueTagFilter, onClear }: StudyTagFilterNoticeProps) {
  const label = studyTagFilterLabel(queueTagFilter);
  if (!label) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClear}
      title={STUDY_PANEL_TEXT.tagFilterClearHint}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-100 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800 transition hover:bg-amber-200 sm:h-8 sm:text-xs"
    >
      {label}
      <span aria-hidden="true" className="text-sm leading-none">&times;</span>
      <span className="sr-only">{STUDY_PANEL_TEXT.tagFilterClearHint}</span>
    </button>
  );
}
