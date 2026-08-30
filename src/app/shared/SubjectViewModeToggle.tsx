import SegmentedControl from "@/app/shared/SegmentedControl";
import {
  SUBJECT_VIEW_COPY,
  SUBJECT_VIEW_MODES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";

type Props = {
  value: SubjectViewMode;
  onChange: (next: SubjectViewMode) => void;
  className?: string;
};

/**
 * Drawn rather than typed: the box-drawing characters that look like a grid or
 * a list in one font collapse to a filled square in another, which is exactly
 * the affordance this control cannot afford to lose.
 */
function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
      <rect x="1" y="2" width="3" height="3" rx="1" />
      <rect x="6" y="2.75" width="9" height="1.5" rx="0.75" />
      <rect x="1" y="6.5" width="3" height="3" rx="1" />
      <rect x="6" y="7.25" width="9" height="1.5" rx="0.75" />
      <rect x="1" y="11" width="3" height="3" rx="1" />
      <rect x="6" y="11.75" width="9" height="1.5" rx="0.75" />
    </svg>
  );
}

/**
 * Grid or list, for any surface that shows subjects.
 *
 * Icons rather than words, because this sits in already-crowded toolbars beside
 * tabs, sorts and a search field; the words stay as the accessible labels.
 */
export default function SubjectViewModeToggle({ value, onChange, className }: Props) {
  return (
    <SegmentedControl
      ariaLabel={SUBJECT_VIEW_COPY.toggleLabel}
      size="sm"
      value={value}
      onChange={onChange}
      className={className}
      options={[
        {
          value: SUBJECT_VIEW_MODES.grid,
          title: SUBJECT_VIEW_COPY.grid,
          label: (
            <>
              <GridIcon />
              <span className="sr-only">{SUBJECT_VIEW_COPY.grid}</span>
            </>
          ),
        },
        {
          value: SUBJECT_VIEW_MODES.list,
          title: SUBJECT_VIEW_COPY.list,
          label: (
            <>
              <ListIcon />
              <span className="sr-only">{SUBJECT_VIEW_COPY.list}</span>
            </>
          ),
        },
      ]}
    />
  );
}
