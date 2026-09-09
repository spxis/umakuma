import ExplorerFilterNotice from "../../shared/ExplorerFilterNotice";
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
 *
 * The chip itself is `ExplorerFilterNotice` now, shared with the search notice,
 * which is the same failure one filter along. What is left here is the only
 * part that is about tags: which label this filter answers to.
 */
export default function StudyTagFilterNotice({ queueTagFilter, onClear }: StudyTagFilterNoticeProps) {
  const label = studyTagFilterLabel(queueTagFilter);
  if (!label) {
    return null;
  }

  return (
    <ExplorerFilterNotice label={label} hint={STUDY_PANEL_TEXT.tagFilterClearHint} onClear={onClear} />
  );
}
