import { isSubjectType, SRS_BUCKETS } from "@/lib/domainConstants";
import {
  shortSubjectTypeLabel,
  subjectTypePillClass,
} from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { PillChip } from "@/app/users/[nickname]/shared/StatusSrsChip";
import { SUBJECT_ROW_LANES } from "@/app/shared/subjectListView";
import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";

import { srsBucketBadgeClass, srsBucketLabel } from "./studyHistoryUi";

type Props = {
  subjectType: string;
  wkLevel: number | null;
  srsStage: number | null;
  srsBucket: HistorySrsBucket;
};

const NEUTRAL_CHIP_CLASS = "border-line bg-surface text-foreground/80";
const CHIP_SIZE_CLASS = "min-h-0 px-1 py-0.5 text-[9px]";

function subjectTypeMetaLabel(type: string): string {
  return isSubjectType(type) ? shortSubjectTypeLabel(type) : type.toUpperCase();
}

function subjectTypeMetaClass(type: string): string {
  return isSubjectType(type) ? subjectTypePillClass(type) : NEUTRAL_CHIP_CLASS;
}

/**
 * Type, level and SRS, each in its own lane.
 *
 * These were four chips in a free-flowing cluster, so a row with no level sat
 * its SRS chip where the row above put its level and a column of items had
 * nothing to scan down. They are three fixed lanes now, sharing their widths
 * with the heading row.
 *
 * The stage number joined the bucket rather than keeping a chip of its own:
 * "GURU" and "S5" say one thing between them, and two chips for it cost a lane
 * that a narrow screen has to spend somewhere.
 */
export default function SubjectMetaLanes({ subjectType, wkLevel, srsStage, srsBucket }: Props) {
  const bucketKnown = srsBucket !== SRS_BUCKETS.unknown;

  return (
    <>
      <span className={SUBJECT_ROW_LANES.type}>
        <PillChip className={`${subjectTypeMetaClass(subjectType)} ${CHIP_SIZE_CLASS}`}>
          {subjectTypeMetaLabel(subjectType)}
        </PillChip>
      </span>

      <span className={`${SUBJECT_ROW_LANES.level} text-xs font-bold text-foreground/70`}>
        {wkLevel === null ? "" : `L${wkLevel}`}
      </span>

      <span className={SUBJECT_ROW_LANES.srs}>
        {bucketKnown ? (
          <PillChip className={`${srsBucketBadgeClass(srsBucket)} ${CHIP_SIZE_CLASS}`}>
            {srsStage === null ? srsBucketLabel(srsBucket) : `${srsBucketLabel(srsBucket)} ${srsStage}`}
          </PillChip>
        ) : srsStage === null ? null : (
          /* An unknown bucket says nothing, but a stage still does. */
          <PillChip className={`${NEUTRAL_CHIP_CLASS} ${CHIP_SIZE_CLASS}`}>S{srsStage}</PillChip>
        )}
      </span>
    </>
  );
}
