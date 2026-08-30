import { describe, expect, it } from "vitest";

import type { FeatureTimelineEntry } from "@/lib/featureTimeline";

import { groupReleasesByMonth, releaseAnchor } from "./releasesView";

function entry(overrides: Partial<FeatureTimelineEntry> = {}): FeatureTimelineEntry {
  return {
    id: "x",
    name: "Something",
    area: "study",
    status: "shipped",
    date: "2026-08-30",
    summary: "s",
    ...overrides,
  } as FeatureTimelineEntry;
}

describe("groupReleasesByMonth", () => {
  it("buckets consecutive releases from the same month together", () => {
    const months = groupReleasesByMonth([
      entry({ id: "a", date: "2026-08-30" }),
      entry({ id: "b", date: "2026-08-29" }),
      entry({ id: "c", date: "2026-07-31" }),
    ]);

    expect(months.map((month) => month.key)).toEqual(["2026-08", "2026-07"]);
    expect(months[0].entries.map((item) => item.id)).toEqual(["a", "b"]);
  });

  /*
   * The list arrives newest first, so walking it once keeps both the months and
   * each month's own releases in that order.
   */
  it("preserves the incoming order inside a month", () => {
    const months = groupReleasesByMonth([
      entry({ id: "newest", date: "2026-08-30" }),
      entry({ id: "older", date: "2026-08-02" }),
    ]);
    expect(months[0].entries.map((item) => item.id)).toEqual(["newest", "older"]);
  });

  it("names the month for a reader", () => {
    expect(groupReleasesByMonth([entry({ date: "2026-08-30" })])[0].label).toBe("August 2026");
  });

  it("handles an empty list", () => {
    expect(groupReleasesByMonth([])).toEqual([]);
  });

  it("starts a new bucket when a month repeats after a gap", () => {
    const months = groupReleasesByMonth([
      entry({ id: "a", date: "2026-08-30" }),
      entry({ id: "b", date: "2026-07-01" }),
      entry({ id: "c", date: "2026-08-01" }),
    ]);
    expect(months.map((month) => month.key)).toEqual(["2026-08", "2026-07", "2026-08"]);
  });
});

describe("releaseAnchor", () => {
  it("makes a version safe to use as a fragment", () => {
    expect(releaseAnchor(entry({ version: "0.75.0" }))).toBe("v0-75-0");
  });

  it("falls back to the id when there is no version", () => {
    expect(releaseAnchor(entry({ id: "planned-thing" }))).toBe("planned-thing");
  });
});
