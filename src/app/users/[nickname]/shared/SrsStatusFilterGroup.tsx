import { srsBucketBadgeClass, srsBucketLabel } from "@/app/shared/studyHistoryUi";
import { WK_STATUSES, type WkStatus } from "@/lib/domainConstants";

import FilterChipButton from "./FilterChipButton";
import { badgeClass, disabledBadgeClass, formatNumber } from "../level-explorer/lib/levelExplorerDisplay";

/**
 * How far along an item is, as a row of chips to filter by.
 *
 * Three surfaces asked this question and each answered it privately: the level
 * explorer had a `wkStatusToneClass` of its own, the study explorer had
 * `studySrsToneClass`, and the rows drew their SRS badge from a third helper.
 * The three agreed by accident and could stop agreeing at any time - and a
 * fourth copy was exactly what a list page needed. This is the one row, and it
 * takes its colours from the badge it filters, so the chip and the pill under
 * it can never say the same stage in two colours.
 *
 * Statuses with nothing in them are left out rather than drawn as an unpressable
 * zero, unless one is the chosen filter - a reader who narrows to Burned and
 * then searches must still see what they narrowed to.
 */

/** Every stage, as opposed to one of them. Not a domain value. */
export const SRS_STATUS_FILTER_ALL = "all";

export type SrsStatusFilter = typeof SRS_STATUS_FILTER_ALL | WkStatus;

/** In the order a member climbs them, with Locked last: it is where they start. */
export const SRS_STATUS_FILTER_ORDER: WkStatus[] = [
  WK_STATUSES.apprentice,
  WK_STATUSES.guru,
  WK_STATUSES.master,
  WK_STATUSES.enlightened,
  WK_STATUSES.burned,
  WK_STATUSES.locked,
];

export type SrsStatusCounts = { all: number } & Record<WkStatus, number>;

export default function SrsStatusFilterGroup({
  counts,
  value,
  onChange,
  allLabel,
  className,
  ariaLabel,
}: {
  counts: SrsStatusCounts;
  value: SrsStatusFilter;
  /** Pressing the chosen chip returns to All, the way the type chips behave. */
  onChange: (next: SrsStatusFilter) => void;
  allLabel: string;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"} role="tablist" aria-label={ariaLabel}>
      <FilterChipButton
        type="button"
        role="tab"
        aria-selected={value === SRS_STATUS_FILTER_ALL}
        onClick={() => onChange(SRS_STATUS_FILTER_ALL)}
        toneClassName={badgeClass(value === SRS_STATUS_FILTER_ALL)}
        label={allLabel}
        count={formatNumber(counts.all)}
      />
      {SRS_STATUS_FILTER_ORDER.map((status) => {
        const active = value === status;
        const count = counts[status];
        if (count === 0 && !active) return null;
        return (
          <FilterChipButton
            key={status}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(active ? SRS_STATUS_FILTER_ALL : status)}
            toneClassName={count === 0 ? disabledBadgeClass() : srsBucketBadgeClass(status, active)}
            label={srsBucketLabel(status)}
            count={formatNumber(count)}
          />
        );
      })}
    </div>
  );
}
