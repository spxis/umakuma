import CodenameText from "@/app/shared/CodenameText";
import { codenameForRelease } from "@/lib/releaseCodenames";

import {
  FEATURE_AREA_LABELS,
  FEATURE_STATUS_LABELS,
  formatFeatureDate,
  groupFeaturesByMonth,
  type FeatureTimelineEntry,
  FEATURE_KINDS,
  FEATURE_STATUSES,
} from "@/lib/featureTimeline";

import { RELEASE_AREA_CLASSES, RELEASE_TIMELINE_COPY } from "./ReleaseTimeline.constants";
import JapaneseInProse from "@/app/shared/JapaneseInProse";

type ReleaseTimelineListProps = {
  entries: FeatureTimelineEntry[];
  /** Adds the Estimated pill to rows whose date is a forecast, not a fact. */
  showEstimateFlag?: boolean;
  /** Label each row with its status, where a tab mixes more than one. */
  showStatusFlag?: boolean;
  /** What an empty tab says. "Nothing queued" is wrong on five of the six. */
  emptyMessage?: string;
  /**
   * The heading a flat list sits under, and the word it counts in.
   *
   * A queue is not a calendar.
   *
   * Unshipped work arrives in queue order, and grouping it by the month of an
   * estimated date - a date typed by hand, and once already in the past -
   * produced headers reading September, August, September, which looks like a
   * list that has lost its order. So every tab but Released is one flat list.
   * The month grouping stays for what has shipped, where the date is a fact.
   */
  queue?: { heading: string; noun: string };
};

/* Cancelled is a refusal and reads as one; a backlog is only parked. */
const STATUS_FLAG_CLASSES: Partial<Record<FeatureTimelineEntry["status"], string>> = {
  [FEATURE_STATUSES.cancelled]: "border-rose-500/40 bg-rose-500/10 text-rose-600",
  [FEATURE_STATUSES.backlogged]: "border-line bg-surface-muted text-foreground/60",
};

function FeatureRow({
  entry,
  showEstimateFlag,
  showStatusFlag,
}: {
  entry: FeatureTimelineEntry;
  showEstimateFlag: boolean;
  showStatusFlag: boolean;
}) {
  return (
    <li className="border-b border-line/60 last:border-b-0">
      {/*
        * Collapsed, like the public releases page. A hundred and seventy-seven
        * releases each showing a full paragraph is a page nobody can scan; the
        * line identifies the release and the prose waits until it is asked for.
        */}
      <details className="group py-3">
      <summary className="flex cursor-pointer list-none flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="flex shrink-0 items-baseline gap-2 sm:w-40 sm:justify-end">
        {entry.version ? (
          <code className="text-[11px] font-semibold text-foreground/60">v{entry.version}</code>
        ) : typeof entry.release === "number" ? (
          <code className="text-[11px] font-black text-foreground/70">{RELEASE_TIMELINE_COPY.queuePosition(entry.release)}</code>
        ) : null}
        <time dateTime={entry.date} className="font-mono text-xs text-foreground/60">
          {formatFeatureDate(entry.date)}
        </time>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{entry.name}</span>

          {(() => {
            const codename = entry.release ? codenameForRelease(entry.release) : null;
            return codename ? (
              <CodenameText
                codename={codename}
                className="text-xs font-semibold text-foreground/60"
              />
            ) : null;
          })()}

          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RELEASE_AREA_CLASSES[entry.area]}`}
          >
            {FEATURE_AREA_LABELS[entry.area]}
          </span>

          {showStatusFlag ? (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                STATUS_FLAG_CLASSES[entry.status] ?? "border-line bg-surface-muted text-foreground/60"
              }`}
            >
              {FEATURE_STATUS_LABELS[entry.status]}
            </span>
          ) : null}

          {showEstimateFlag && entry.dateIsEstimate ? (
            <span className="inline-flex items-center rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/60">
              {RELEASE_TIMELINE_COPY.estimateNote}
            </span>
          ) : null}

          {/* The board fields: a bug reads as a bug, and a claim says who. */}
          {entry.kind === FEATURE_KINDS.bug ? (
            <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
              {RELEASE_TIMELINE_COPY.bug}
            </span>
          ) : null}
          {entry.owner ? (
            <span
              title={entry.claimedAt}
              className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
            >
              {RELEASE_TIMELINE_COPY.inProgress} · {entry.owner}
            </span>
          ) : null}
        </div>
      </div>

      <span
        aria-hidden="true"
        className="shrink-0 self-center text-foreground/35 transition group-open:rotate-90"
      >
        ›
      </span>
      </summary>

      <p className="mt-2 text-sm text-foreground/70 sm:ml-44">
        <JapaneseInProse text={entry.summary} />
      </p>
      </details>
    </li>
  );
}

export default function ReleaseTimelineList({
  entries,
  showEstimateFlag = false,
  showStatusFlag = false,
  emptyMessage = RELEASE_TIMELINE_COPY.emptyPlanned,
  queue,
}: ReleaseTimelineListProps) {
  if (entries.length === 0) {
    return <p className="py-6 text-sm text-foreground/60">{emptyMessage}</p>;
  }

  const rows = entries.map((entry) => (
    <FeatureRow
      key={entry.id}
      entry={entry}
      showEstimateFlag={showEstimateFlag}
      showStatusFlag={showStatusFlag}
    />
  ));

  if (queue) {
    return (
      <section>
        <h3 className="mb-1 flex items-baseline gap-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
          {queue.heading}
          <span className="font-semibold text-foreground/60">
            {entries.length} {queue.noun}
          </span>
        </h3>
        <ul>{rows}</ul>
      </section>
    );
  }

  const groups = groupFeaturesByMonth(entries);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <details key={group.monthKey} open className="group/month">
          <summary className="mb-1 flex cursor-pointer list-none items-baseline gap-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
            <span aria-hidden="true" className="text-foreground/35 transition group-open/month:rotate-90">›</span>
            {group.label}
            <span className="font-semibold text-foreground/60">{group.entries.length} released</span>
          </summary>

          <ul className="flex flex-col">
            {group.entries.map((entry) => (
              <FeatureRow
                key={entry.id}
                entry={entry}
                showEstimateFlag={showEstimateFlag}
                showStatusFlag={showStatusFlag}
              />
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
