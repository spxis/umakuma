import { describe, expect, it } from "vitest";

import type { FeatureTimelineEntry } from "@/lib/featureTimeline";

import { areaCounts,
  currentMonthKeyIn,
  filterByArea,
  parseAreaParam,
  groupReleasesByMonth, releaseAnchor } from "./releasesView";
import { monthIsOpen, monthsAfterToggle } from "./useOpenMonths";

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

/*
 * The page opens on the month you are in and folds the rest, so it stops
 * opening on a wall of a hundred entries with the month somebody came for a
 * long scroll away.
 */
describe("the month a reader lands on", () => {
  const months = [
    { key: "2026-09", label: "September 2026", entries: [] },
    { key: "2026-08", label: "August 2026", entries: [] },
  ];

  it("is this month when this month has shipped something", () => {
    expect(currentMonthKeyIn(months, new Date("2026-09-03T12:00:00Z"))).toBe("2026-09");
  });

  /* The first of the month has nothing in it yet; the newest month still opens. */
  it("falls back to the newest month when this one is empty", () => {
    expect(currentMonthKeyIn(months, new Date("2026-10-01T12:00:00Z"))).toBe("2026-09");
  });

  /*
   * Vancouver's month, not UTC's. Late on the 31st in Vancouver it is already
   * the 1st in UTC, and the page would fold the month the reader is looking at.
   */
  it("keeps the site's own clock", () => {
    expect(currentMonthKeyIn(months, new Date("2026-09-01T04:00:00Z"))).toBe("2026-08");
  });
});

describe("holding months open", () => {
  const every = ["2026-09", "2026-08", "2026-07"];

  it("opens this month and nothing else until the reader chooses", () => {
    expect(monthIsOpen("2026-09", null, "2026-09")).toBe(true);
    expect(monthIsOpen("2026-08", null, "2026-09")).toBe(false);
  });

  it("remembers exactly what was left open", () => {
    expect(monthIsOpen("2026-09", ["2026-08"], "2026-09")).toBe(false);
    expect(monthIsOpen("2026-08", ["2026-08"], "2026-09")).toBe(true);
  });

  /* A toggle starts from what is showing, so the first click on a default is a close. */
  it("closes the current month on the first press", () => {
    expect(monthsAfterToggle("2026-09", null, "2026-09", every)).toEqual([]);
  });

  it("adds a month without disturbing the others", () => {
    expect(monthsAfterToggle("2026-07", ["2026-09"], "2026-09", every)).toEqual(["2026-09", "2026-07"]);
  });
});

/*
 * Every release was already tagged by area and the tags were usable from
 * nowhere: no way to ask for the games work, or everything that touched search.
 */
describe("filtering the releases by area", () => {
  const entry = (id: string, area: string, date: string) =>
    ({ id, area, date, name: id, summary: id, status: "shipped", kind: "feature" }) as unknown as FeatureTimelineEntry;

  const entries = [
    entry("a", "study", "2026-09-01"),
    entry("b", "games", "2026-08-01"),
    entry("c", "study", "2026-07-01"),
    entry("d", "admin", "2026-06-01"),
  ];

  it("counts every area it holds, commonest first", () => {
    expect(areaCounts(entries)).toEqual([
      { area: "study", count: 2 },
      { area: "admin", count: 1 },
      { area: "games", count: 1 },
    ]);
  });

  /* An area nobody has shipped in is a chip that answers nothing. */
  it("offers no chip for an area with no releases", () => {
    expect(areaCounts(entries).map((entry) => entry.area)).not.toContain("news");
  });

  it("keeps only the area asked for", () => {
    expect(filterByArea(entries, "study").map((entry) => entry.id)).toEqual(["a", "c"]);
  });

  it("keeps everything when nothing is asked for", () => {
    expect(filterByArea(entries, null)).toHaveLength(4);
  });

  /*
   * A hand-typed segment filters to nothing rather than quietly showing
   * everything: a page that ignores the filter it is displaying is worse than
   * an empty one that says so.
   */
  it("reads only an area the site actually has", () => {
    expect(parseAreaParam("games")).toBe("games");
    expect(parseAreaParam("nonsense")).toBeNull();
    expect(parseAreaParam(undefined)).toBeNull();
    expect(parseAreaParam(["study", "games"])).toBe("study");
  });
});
