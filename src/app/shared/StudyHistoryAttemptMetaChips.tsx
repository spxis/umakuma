import { isSubjectType } from "@/lib/domainConstants";
import {
  shortSubjectTypeLabel,
  subjectTypePillClass,
} from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { PillChip } from "@/app/users/[nickname]/shared/StatusSrsChip";
import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";

import { srsBucketBadgeClass, srsBucketLabel } from "./studyHistoryUi";

type Props = {
  subjectType: string;
  wkLevel: number | null;
  srsStage: number | null;
  srsBucket: HistorySrsBucket;
  className?: string;
  compact?: boolean;
};

const NEUTRAL_CHIP_CLASS = "border-line bg-surface text-foreground/80";

function subjectTypeMetaLabel(type: string): string {
  return isSubjectType(type) ? shortSubjectTypeLabel(type) : type.toUpperCase();
}

function subjectTypeMetaClass(type: string): string {
  return isSubjectType(type) ? subjectTypePillClass(type) : NEUTRAL_CHIP_CLASS;
}

export default function StudyHistoryAttemptMetaChips({
  subjectType,
  wkLevel,
  srsStage,
  srsBucket,
  className,
  compact = false,
}: Props) {
  const sizeClass = compact ? "min-h-0 px-1 py-0.5 text-[9px]" : "";

  return (
    <div className={className ?? "mt-1 flex flex-wrap items-center gap-1"}>
      <PillChip className={`${subjectTypeMetaClass(subjectType)} ${sizeClass}`}>{subjectTypeMetaLabel(subjectType)}</PillChip>
      {wkLevel !== null ? <PillChip className={`${NEUTRAL_CHIP_CLASS} ${sizeClass}`}>L{wkLevel}</PillChip> : null}
      {srsStage !== null ? <PillChip className={`${NEUTRAL_CHIP_CLASS} ${sizeClass}`}>S{srsStage}</PillChip> : null}
      <PillChip className={`${srsBucketBadgeClass(srsBucket)} ${sizeClass}`}>{srsBucketLabel(srsBucket)}</PillChip>
    </div>
  );
}
