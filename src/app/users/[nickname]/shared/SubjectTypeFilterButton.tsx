import { disabledBadgeClass, formatNumber, typeBadgeClass } from "../level-explorer/lib/levelExplorerDisplay";
import { subjectTypeFilterLabel } from "./subjectTypeLabels";
import FilterChipButton from "./FilterChipButton";
import type { SubjectType } from "@/lib/domainConstants";

type Props = {
  type: SubjectType;
  count?: number;
  countLabel?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function SubjectTypeFilterButton({
  type,
  count,
  countLabel,
  active,
  disabled = false,
  onClick,
}: Props) {
  const resolvedCountLabel = countLabel ?? formatNumber(count ?? 0);
  const showDisabledStyle = disabled && !active;

  return (
    <FilterChipButton
      type="button"
      disabled={disabled}
      onClick={onClick}
      toneClassName={showDisabledStyle ? disabledBadgeClass() : `${typeBadgeClass(type, active, false)}${disabled ? " cursor-not-allowed opacity-70" : ""}`}
      className="transition"
      label={subjectTypeFilterLabel(type)}
      count={resolvedCountLabel}
    />
  );
}
