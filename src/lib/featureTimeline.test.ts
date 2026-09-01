import { describe, expect, it } from "vitest";

import {
  FEATURE_AREA_LABELS,
  FEATURE_AREA_VALUES,
  FEATURE_STATUSES,
  featuresByStatus,
  formatFeatureDate,
  groupFeaturesByMonth,
  isIsoDate,
  loadFeatureTimeline,
  sortFeaturesByRelease,
  sortFeaturesNewestFirst,
  summarizeFeatureTimeline,
  type FeatureTimelineEntry,
} from "./featureTimeline";

function entry(overrides: Partial<FeatureTimelineEntry> = {}): FeatureTimelineEntry {
  return {
    id: "example",
    name: "Example",
    area: "platform",
    status: FEATURE_STATUSES.shipped,
    date: "2026-08-29",
    summary: "An example feature.",
    ...overrides,
  };
}

describe("loadFeatureTimeline", () => {
  it("parses the shipped data file without throwing", () => {
    const entries = loadFeatureTimeline();
    expect(entries.length).toBeGreaterThan(0);
  });

  it("gives every entry a unique id", () => {
    const entries = loadFeatureTimeline();
    const ids = new Set(entries.map((item) => item.id));
    expect(ids.size).toBe(entries.length);
  });

  it("dates every entry as a valid calendar day", () => {
    for (const item of loadFeatureTimeline()) {
      expect(isIsoDate(item.date), `${item.id} has date ${item.date}`).toBe(true);
    }
  });

  it("marks unshipped entries as estimates and shipped entries as actual", () => {
    for (const item of loadFeatureTimeline()) {
      expect(item.dateIsEstimate, item.id).toBe(item.status !== FEATURE_STATUSES.shipped);
    }
  });

  it("stamps releasedAt only on shipped entries, matching their version order", () => {
    const stamped = loadFeatureTimeline().filter((item) => item.releasedAt);
    for (const item of stamped) {
      expect(item.status, item.id).toBe(FEATURE_STATUSES.shipped);
      expect(Number.isNaN(Date.parse(item.releasedAt!)), item.id).toBe(false);
    }

    const ordered = [...stamped].sort(
      (left, right) => Number(left.version!.split(".")[1]) - Number(right.version!.split(".")[1]),
    );
    for (let index = 1; index < ordered.length; index += 1) {
      expect(
        ordered[index].releasedAt! >= ordered[index - 1].releasedAt!,
        `${ordered[index].id} released before ${ordered[index - 1].id}`,
      ).toBe(true);
    }
  });

  it("orders planned work with distinct release numbers", () => {
    const planned = featuresByStatus(loadFeatureTimeline(), FEATURE_STATUSES.planned);
    const releases = planned.map((item) => item.release);

    expect(releases.every((value) => typeof value === "number")).toBe(true);
    expect(new Set(releases).size).toBe(planned.length);
  });

  it("labels every area it uses", () => {
    for (const item of loadFeatureTimeline()) {
      expect(FEATURE_AREA_VALUES).toContain(item.area);
      expect(FEATURE_AREA_LABELS[item.area]).toBeTruthy();
    }
  });
});

describe("isIsoDate", () => {
  it("accepts a real calendar day", () => {
    expect(isIsoDate("2026-08-29")).toBe(true);
  });

  it("rejects a malformed or impossible date", () => {
    expect(isIsoDate("2026-8-29")).toBe(false);
    expect(isIsoDate("29-08-2026")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("sortFeaturesNewestFirst", () => {
  it("puts the most recent date first", () => {
    const sorted = sortFeaturesNewestFirst([
      entry({ id: "old", date: "2026-04-03" }),
      entry({ id: "new", date: "2026-08-29" }),
      entry({ id: "mid", date: "2026-06-27" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["new", "mid", "old"]);
  });

  it("orders a same-day batch by version, newest release first", () => {
    const sorted = sortFeaturesNewestFirst([
      entry({ id: "older", name: "Alpha", version: "0.53.0" }),
      entry({ id: "newer", name: "Zeta", version: "0.57.0" }),
      entry({ id: "middle", name: "Beta", version: "0.55.0" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["newer", "middle", "older"]);
  });

  it("breaks a same-day tie on name when versions are absent", () => {
    const sorted = sortFeaturesNewestFirst([
      entry({ id: "b", name: "Beta" }),
      entry({ id: "a", name: "Alpha" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("does not mutate its input", () => {
    const input = [entry({ id: "old", date: "2026-04-03" }), entry({ id: "new", date: "2026-08-29" })];
    sortFeaturesNewestFirst(input);
    expect(input.map((item) => item.id)).toEqual(["old", "new"]);
  });
});

describe("sortFeaturesByRelease", () => {
  it("orders by release number ascending", () => {
    const sorted = sortFeaturesByRelease([
      entry({ id: "third", release: 3 }),
      entry({ id: "first", release: 1 }),
      entry({ id: "second", release: 2 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });

  it("sends entries with no release number to the end", () => {
    const sorted = sortFeaturesByRelease([
      entry({ id: "none", name: "None" }),
      entry({ id: "one", name: "One", release: 1 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["one", "none"]);
  });
});

describe("groupFeaturesByMonth", () => {
  it("groups consecutive entries that share a month", () => {
    const groups = groupFeaturesByMonth([
      entry({ id: "a", date: "2026-08-29" }),
      entry({ id: "b", date: "2026-08-28" }),
      entry({ id: "c", date: "2026-04-03" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].monthKey).toBe("2026-08");
    expect(groups[0].entries.map((item) => item.id)).toEqual(["a", "b"]);
    expect(groups[1].entries.map((item) => item.id)).toEqual(["c"]);
  });

  it("labels a month in words", () => {
    const [group] = groupFeaturesByMonth([entry({ date: "2026-08-29" })]);
    expect(group.label).toBe("August 2026");
  });

  it("returns nothing for an empty list", () => {
    expect(groupFeaturesByMonth([])).toEqual([]);
  });
});

describe("summarizeFeatureTimeline", () => {
  it("counts each status and reports the shipped date range", () => {
    const totals = summarizeFeatureTimeline([
      entry({ id: "a", date: "2026-04-03" }),
      entry({ id: "b", date: "2026-08-29" }),
      entry({ id: "c", status: FEATURE_STATUSES.planned, date: "2026-09-01" }),
    ]);

    expect(totals).toEqual({
      total: 3,
      shipped: 2,
      planned: 1,
      firstShippedDate: "2026-04-03",
      lastShippedDate: "2026-08-29",
    });
  });

  it("reports no range when nothing has shipped", () => {
    const totals = summarizeFeatureTimeline([entry({ status: FEATURE_STATUSES.planned })]);
    expect(totals.firstShippedDate).toBeNull();
    expect(totals.lastShippedDate).toBeNull();
  });
});

describe("formatFeatureDate", () => {
  it("renders the calendar day it was given", () => {
    expect(formatFeatureDate("2026-08-29")).toBe("Aug 29, 2026");
  });

  it("does not shift the day for viewers west of UTC", () => {
    const original = process.env.TZ;
    process.env.TZ = "America/Vancouver";
    try {
      expect(formatFeatureDate("2026-01-01")).toBe("Jan 1, 2026");
    } finally {
      process.env.TZ = original;
    }
  });
});

describe("versions", () => {
  const VERSION_PATTERN = /^0\.\d+\.0$/;

  it("stamps every shipped entry with a version and no planned entry", () => {
    for (const item of loadFeatureTimeline()) {
      if (item.status === FEATURE_STATUSES.shipped) {
        expect(item.version, item.id).toMatch(VERSION_PATTERN);
      } else {
        expect(item.version, item.id).toBeUndefined();
      }
    }
  });

  it("gives every release a distinct version", () => {
    const versions = featuresByStatus(loadFeatureTimeline(), FEATURE_STATUSES.shipped).map(
      (item) => item.version,
    );
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("numbers versions 1..N with no gaps, in date order", () => {
    const shipped = featuresByStatus(loadFeatureTimeline(), FEATURE_STATUSES.shipped);
    const minors = shipped
      .map((item) => Number(item.version!.split(".")[1]))
      .sort((left, right) => left - right);
    expect(minors).toEqual(minors.map((_, index) => index + 1));

    const byMinor = [...shipped].sort(
      (left, right) => Number(left.version!.split(".")[1]) - Number(right.version!.split(".")[1]),
    );
    for (let index = 1; index < byMinor.length; index += 1) {
      expect(
        byMinor[index].date >= byMinor[index - 1].date,
        `${byMinor[index].id} (${byMinor[index].version}) dated before ${byMinor[index - 1].id}`,
      ).toBe(true);
    }
  });

  it("keeps the footer constant and package.json on the latest release", async () => {
    const shipped = featuresByStatus(loadFeatureTimeline(), FEATURE_STATUSES.shipped);
    const latest = shipped
      .map((item) => item.version!)
      .sort((left, right) => Number(left.split(".")[1]) - Number(right.split(".")[1]))
      .at(-1);

    const { APP_VERSION, APP_VERSION_DATE } = await import("./appVersion");
    expect(APP_VERSION).toBe(latest);

    const latestEntry = shipped.find((item) => item.version === latest)!;
    expect(APP_VERSION_DATE).toBe(latestEntry.date);

    const pkg = (await import("../../package.json")) as { version: string };
    expect(pkg.version).toBe(latest);
  });
});

/*
 * A release is dated by the Vancouver day, like every other date in this app.
 *
 * UTC rolls over seven hours before Vancouver does, so an evening's releases
 * took tomorrow's date and the releases page grew a phantom September above a
 * still-running August. Nothing caught it, because a UTC date is a perfectly
 * valid date - it was just the wrong one, and only a reader in the right
 * timezone could see that.
 */
describe("when a release says it shipped", () => {
  const rows = loadFeatureTimeline().filter((entry) => entry.releasedAt);

  it("never claims to have shipped in the future", () => {
    const now = Date.now();
    for (const entry of rows) {
      expect(
        Date.parse(entry.releasedAt!),
        `${entry.version} says it shipped at ${entry.releasedAt}, which has not happened yet`,
      ).toBeLessThanOrEqual(now);
    }
  });

  /*
   * The day and the instant have to agree once the instant is read in
   * Vancouver. An entry dated the 31st whose instant lands on the 2nd is one
   * or the other being guessed.
   */
  it("dates each release by the Vancouver day of its own timestamp", () => {
    for (const entry of rows) {
      const vancouverDay = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Vancouver",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(entry.releasedAt!));

      expect(
        vancouverDay,
        `${entry.version} is dated ${entry.date} but its timestamp is ${vancouverDay} in Vancouver`,
      ).toBe(entry.date);
    }
  });
});
