import { disabledBadgeClass, formatNumber, typeBadgeClass } from "../level-explorer/lib/levelExplorerDisplay";
import { subjectTypeFilterLabel } from "./subjectTypeLabels";

type SubjectType = "radical" | "kanji" | "vocabulary";

type Props = {
  type: SubjectType;
  count: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function SubjectTypeFilterButton({
  type,
  count,
  active,
  disabled = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] transition ${
        disabled ? disabledBadgeClass() : typeBadgeClass(type, active, false)
      }`}
    >
      {subjectTypeFilterLabel(type)} ({formatNumber(count)})
    </button>
  );
}
