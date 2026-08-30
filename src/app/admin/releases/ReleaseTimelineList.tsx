import CodenameText from "@/app/shared/CodenameText";
import { codenameForVersion } from "@/lib/releaseCodenames";

import {
  FEATURE_AREA_LABELS,
  FEATURE_STATUS_LABELS,
  formatFeatureDate,
  groupFeaturesByMonth,
  type FeatureTimelineEntry,
} from "@/lib/featureTimeline";

import { RELEASE_AREA_CLASSES, RELEASE_TIMELINE_COPY } from "./ReleaseTimeline.constants";

type ReleaseTimelineListProps = {
  entries: FeatureTimelineEntry[];
  showEstimateFlag?: boolean;
  /** Shelved tab: label each row backlogged or killed. */
  showStatusFlag?: boolean;
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
    <li className="flex flex-col gap-1 border-b border-line/60 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="flex shrink-0 items-baseline gap-2 sm:w-40 sm:justify-end">
        {entry.version ? (
          <code className="text-[11px] font-semibold text-foreground/45">v{entry.version}</code>
        ) : null}
        <time dateTime={entry.date} className="font-mono text-xs text-foreground/60">
          {formatFeatureDate(entry.date)}
        </time>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{entry.name}</span>

          {(() => {
            const codename = entry.version ? codenameForVersion(entry.version) : null;
            return codename ? (
              <CodenameText
                codename={codename}
                className="text-xs font-semibold text-foreground/40"
              />
            ) : null;
          })()}

          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RELEASE_AREA_CLASSES[entry.area]}`}
          >
            {FEATURE_AREA_LABELS[entry.area]}
          </span>

          {showStatusFlag ? (
            <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
              {FEATURE_STATUS_LABELS[entry.status]}
            </span>
          ) : null}

          {showEstimateFlag && entry.dateIsEstimate ? (
            <span className="inline-flex items-center rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/60">
              {RELEASE_TIMELINE_COPY.estimateNote}
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-foreground/70">{entry.summary}</p>
      </div>
    </li>
  );
}

export default function ReleaseTimelineList({
  entries,
  showEstimateFlag = false,
  showStatusFlag = false,
}: ReleaseTimelineListProps) {
  const groups = groupFeaturesByMonth(entries);

  if (groups.length === 0) {
    return <p className="py-6 text-sm text-foreground/60">{RELEASE_TIMELINE_COPY.emptyPlanned}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.monthKey}>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-foreground/50">
            {group.label}
            <span className="ml-2 font-semibold text-foreground/35">
              {group.entries.length} {showEstimateFlag ? "planned" : "released"}
            </span>
          </h3>

          <ul className="flex flex-col">
            {group.entries.map((entry) => (
              <FeatureRow key={entry.id} entry={entry} showEstimateFlag={showEstimateFlag} showStatusFlag={showStatusFlag} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
