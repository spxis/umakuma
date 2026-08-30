import type { FeatureTimelineEntry } from "@/lib/featureTimeline";

export type ReleaseMonth = {
  /** `YYYY-MM`, used as the React key and for ordering. */
  key: string;
  label: string;
  entries: FeatureTimelineEntry[];
};

const MONTH_FORMAT = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** The stable anchor for one release, so a link can point at it. */
export function releaseAnchor(entry: FeatureTimelineEntry): string {
  return entry.version ? `v${entry.version.replace(/\./g, "-")}` : entry.id;
}

/**
 * Releases bucketed by calendar month, newest month first.
 *
 * The incoming list is already sorted newest first, so months come out in the
 * right order by walking it once and starting a bucket whenever the month
 * changes. That keeps a month's own releases in their sorted order too.
 */
export function groupReleasesByMonth(entries: FeatureTimelineEntry[]): ReleaseMonth[] {
  const months: ReleaseMonth[] = [];

  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.key === key) {
      last.entries.push(entry);
      continue;
    }

    months.push({
      key,
      label: MONTH_FORMAT.format(new Date(`${key}-01T00:00:00Z`)),
      entries: [entry],
    });
  }

  return months;
}
