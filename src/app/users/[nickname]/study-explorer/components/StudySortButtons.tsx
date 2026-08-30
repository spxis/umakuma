import type { StudyWaitSortOrder } from "../lib/studyExplorerTypes";
import { badgeClass } from "../lib/studyExplorerUtils";
import { STUDY_PANEL_TEXT } from "./StudyExplorer.constants";

type SortOption = {
  value: StudyWaitSortOrder;
  /** Abbreviated for narrow screens, where five chips will not fit spelled out. */
  short: string;
  full: string;
  /** Difficulty sorts need review history, so they only apply to the review queue. */
  difficultyOnly?: boolean;
};

const SORT_OPTIONS: readonly SortOption[] = [
  { value: "oldest_wait", short: STUDY_PANEL_TEXT.oldestWaitShort, full: STUDY_PANEL_TEXT.oldestWait },
  { value: "newest_wait", short: STUDY_PANEL_TEXT.newestWaitShort, full: STUDY_PANEL_TEXT.newestWait },
  { value: "random_wait", short: STUDY_PANEL_TEXT.randomizeWaitShort, full: STUDY_PANEL_TEXT.randomizeWait },
  { value: "easiest", short: STUDY_PANEL_TEXT.easiestShort, full: STUDY_PANEL_TEXT.easiest, difficultyOnly: true },
  { value: "hardest", short: STUDY_PANEL_TEXT.hardestShort, full: STUDY_PANEL_TEXT.hardest, difficultyOnly: true },
];

type Props = {
  value: StudyWaitSortOrder;
  onChange: (next: StudyWaitSortOrder) => void;
  /** Whether the easiest/hardest pair applies to the current queue. */
  includeDifficulty: boolean;
};

/**
 * The sort chips above the results.
 *
 * Driven from a list rather than five hand-written buttons, which had drifted
 * into five copies of the same forty-token class string.
 */
export default function StudySortButtons({ value, onChange, includeDifficulty }: Props) {
  return (
    <>
      {SORT_OPTIONS.filter((option) => includeDifficulty || !option.difficultyOnly).map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] sm:flex-none sm:px-3 sm:text-xs sm:tracking-[0.1em] ${badgeClass(value === option.value)}`}
        >
          <span className="sm:hidden">{option.short}</span>
          <span className="hidden sm:inline">{option.full}</span>
        </button>
      ))}
    </>
  );
}
