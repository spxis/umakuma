"use client";

import CompactFilterRow from "@/app/shared/CompactFilterRow";
import FilterChipButton, { filterChipTone } from "@/app/shared/FilterChip";
import { FEATURE_AREA_LABELS, FEATURE_AREA_VALUES, FEATURE_KIND_LABELS, FEATURE_KIND_VALUES } from "@/lib/featureTimeline";
import type { FeatureArea, FeatureKind } from "@/lib/featureTimeline";

import {
  RELEASE_TIMELINE_COPY,
  TICKET_FIELD_CLASS,
  TICKET_LANE_LABELS,
  TICKET_SELECT_CLASS,
  TICKET_SORT_LABELS,
} from "./ReleaseTimeline.constants";
import { TICKET_LANE_ORDER, TICKET_SORT_VALUES, type TicketBoardView, type TicketLane, type TicketSort } from "./ticketBoardView";

type Props = {
  view: TicketBoardView;
  counts: Record<TicketLane, number>;
  unfinished: number;
  total: number;
  shown: number;
  onChange: (part: Partial<TicketBoardView>) => void;
};

/**
 * The board's controls: which lane, which kind and area, some words, and an
 * order. Counted from the same list the rows come from, so a chip's number
 * is what pressing it would show.
 */
export default function TicketFilters({ view, counts, unfinished, total, shown, onChange }: Props) {
  const chip = (lane: TicketBoardView["lane"], label: string, count: number, chipClass: (selected: boolean) => string) => (
    <FilterChipButton
      key={lane}
      type="button"
      label={label}
      count={count}
      aria-pressed={view.lane === lane}
      toneClassName={filterChipTone(view.lane === lane)}
      className={chipClass(view.lane === lane)}
      onClick={() => onChange({ lane })}
    />
  );

  return (
    <div className="mb-4 flex flex-col gap-2">
      {/* One line on a phone until asked for more: the lane that is on, and the rest behind the row's label. */}
      <CompactFilterRow label={RELEASE_TIMELINE_COPY.filterLanes}>
        {(chipClass) => (
          <>
            {chip("unfinished", RELEASE_TIMELINE_COPY.filterUnfinished, unfinished, chipClass)}
            {chip("all", RELEASE_TIMELINE_COPY.filterAll, total, chipClass)}
            <span aria-hidden="true" className="h-4 w-px bg-line max-sm:hidden" />
            {TICKET_LANE_ORDER.map((lane) => chip(lane, TICKET_LANE_LABELS[lane], counts[lane], chipClass))}
          </>
        )}
      </CompactFilterRow>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${TICKET_FIELD_CLASS} sm:w-64`}
          value={view.text}
          placeholder={RELEASE_TIMELINE_COPY.filterFind}
          aria-label={RELEASE_TIMELINE_COPY.filterFind}
          onChange={(event) => onChange({ text: event.target.value })}
        />
        <select
          className={TICKET_SELECT_CLASS}
          value={view.kind}
          aria-label={RELEASE_TIMELINE_COPY.filterKind}
          onChange={(event) => onChange({ kind: event.target.value as FeatureKind | "all" })}
        >
          <option value="all">{RELEASE_TIMELINE_COPY.filterEveryKind}</option>
          {FEATURE_KIND_VALUES.map((kind) => (
            <option key={kind} value={kind}>
              {FEATURE_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <select
          className={TICKET_SELECT_CLASS}
          value={view.area}
          aria-label={RELEASE_TIMELINE_COPY.filterArea}
          onChange={(event) => onChange({ area: event.target.value as FeatureArea | "all" })}
        >
          <option value="all">{RELEASE_TIMELINE_COPY.filterEveryArea}</option>
          {FEATURE_AREA_VALUES.map((area) => (
            <option key={area} value={area}>
              {FEATURE_AREA_LABELS[area]}
            </option>
          ))}
        </select>
        <select
          className={TICKET_SELECT_CLASS}
          value={view.sort}
          aria-label={RELEASE_TIMELINE_COPY.filterSort}
          onChange={(event) => onChange({ sort: event.target.value as TicketSort })}
        >
          {TICKET_SORT_VALUES.map((sort) => (
            <option key={sort} value={sort}>
              {TICKET_SORT_LABELS[sort]}
            </option>
          ))}
        </select>
        <span className="text-xs text-foreground/60">{RELEASE_TIMELINE_COPY.shown(shown, total)}</span>
      </div>
    </div>
  );
}
