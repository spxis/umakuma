import { allBadgeClass, disabledBadgeClass, formatNumber } from "../level-explorer/lib/levelExplorerDisplay";
import { SUBJECT_TYPE_VALUES, type SubjectType } from "@/lib/domainConstants";

import FilterChipButton from "./FilterChipButton";
import SubjectTypeFilterButton from "./SubjectTypeFilterButton";

type Props = {
  counts: {
    all: number;
    radical: number;
    kanji: number;
    vocabulary: number;
  };
  allLabel: string;
  allCount?: number;
  allActive: boolean;
  activeTypes: Record<SubjectType, boolean>;
  onClickAll: () => void;
  onClickType: (type: SubjectType) => void;
  className?: string;
  allButtonClassName?: string;
  showPlaceholderCounts?: boolean;
  disabled?: boolean;
  hideZeroInactive?: boolean;
};

export default function SubjectTypeFilterGroup({
  counts,
  allLabel,
  allCount,
  allActive,
  activeTypes,
  onClickAll,
  onClickType,
  className,
  allButtonClassName,
  showPlaceholderCounts = false,
  disabled = false,
  hideZeroInactive = false,
}: Props) {
  const formatCount = (value: number): string => (showPlaceholderCounts ? "..." : formatNumber(value));
  const allDisabledStyle = disabled && !allActive;

  return (
    <div className={className ?? "flex flex-wrap gap-2"}>
      <FilterChipButton
        type="button"
        disabled={disabled}
        onClick={onClickAll}
        toneClassName={allDisabledStyle ? disabledBadgeClass() : `${allButtonClassName ?? allBadgeClass(allActive)}${disabled ? " cursor-not-allowed opacity-70" : ""}`}
        className="transition"
        label={allLabel}
        count={formatCount(allCount ?? counts.all)}
      />
      {SUBJECT_TYPE_VALUES.map((type) => {
        const isInactiveZero = hideZeroInactive && !activeTypes[type] && counts[type] === 0;
        if (isInactiveZero) {
          return null;
        }

        return (
          <SubjectTypeFilterButton
            key={type}
            type={type}
            countLabel={formatCount(counts[type])}
            active={activeTypes[type]}
            disabled={disabled}
            onClick={() => onClickType(type)}
          />
        );
      })}
    </div>
  );
}
