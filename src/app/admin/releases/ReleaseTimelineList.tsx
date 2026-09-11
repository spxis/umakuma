import CodenameText from "@/app/shared/CodenameText";
import { codenameForRelease } from "@/lib/releaseCodenames";

import {
  FEATURE_AREA_LABELS,
  formatFeatureDate,
  groupFeaturesByMonth,
  type FeatureTimelineEntry,
  FEATURE_KINDS,
} from "@/lib/featureTimeline";

import { RELEASE_AREA_CLASSES, RELEASE_TIMELINE_COPY } from "./ReleaseTimeline.constants";
import JapaneseInProse from "@/app/shared/JapaneseInProse";

/**
 * What has shipped, grouped by the month it shipped. The file holds shipped
 * work only - the queue lives on the board - so this list has one shape and
 * the date under every row is a fact, which is what makes the month a
 * heading worth having.
 */
type ReleaseTimelineListProps = {
  entries: FeatureTimelineEntry[];
  emptyMessage?: string;
};

function FeatureRow({ entry }: { entry: FeatureTimelineEntry }) {
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
        {entry.version ? <code className="text-[11px] font-semibold text-foreground/60">v{entry.version}</code> : null}
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

          {/* A bug reads as a bug. */}
          {entry.kind === FEATURE_KINDS.bug ? (
            <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
              {RELEASE_TIMELINE_COPY.bug}
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
  emptyMessage = RELEASE_TIMELINE_COPY.emptyReleased,
}: ReleaseTimelineListProps) {
  if (entries.length === 0) {
    return <p className="py-6 text-sm text-foreground/60">{emptyMessage}</p>;
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
              <FeatureRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
