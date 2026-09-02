import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FEATURE_STATUSES, type FeatureTimelineEntry } from "@/lib/featureTimeline";

import ReleaseTimelineList from "./ReleaseTimelineList";

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

function entry(overrides: Partial<FeatureTimelineEntry> & { id: string }): FeatureTimelineEntry {
  return {
    name: overrides.id,
    area: "platform",
    status: FEATURE_STATUSES.planned,
    date: "2026-09-01",
    dateIsEstimate: true,
    summary: "Something to do.",
    ...overrides,
  };
}

/**
 * A queue is not a calendar.
 *
 * Planned work arrives in queue order and used to be grouped by the month of
 * its estimated date, so the headers read September, August, September and
 * the list looked as though it had lost its order. The estimates are typed by
 * hand and one had already passed; they are not something to group under.
 */
describe("the planned tab", () => {
  const queue = [
    entry({ id: "first", release: 1, date: "2026-09-02" }),
    entry({ id: "second", release: 2, date: "2026-08-31" }),
    entry({ id: "third", release: 3, date: "2026-09-05" }),
  ];
  const doc = render(<ReleaseTimelineList entries={queue} showEstimateFlag />);

  it("keeps the queue in queue order, whatever the estimated dates say", () => {
    const names = [...doc.querySelectorAll("li summary")].map((el) => el.textContent ?? "");
    expect(names[0]).toContain("first");
    expect(names[1]).toContain("second");
    expect(names[2]).toContain("third");
  });

  it("does not group a queue by month", () => {
    expect(doc.body.textContent).not.toContain("August");
    expect(doc.querySelectorAll("details.group\\/month")).toHaveLength(0);
  });

  it("shows each item's position where a release would show its version", () => {
    const codes = [...doc.querySelectorAll("code")].map((el) => el.textContent);
    expect(codes).toEqual(["#1", "#2", "#3"]);
  });
});

describe("the released tab", () => {
  it("still groups what shipped by the month it shipped", () => {
    const doc = render(
      <ReleaseTimelineList
        entries={[
          entry({ id: "later", status: FEATURE_STATUSES.shipped, version: "0.2.0", date: "2026-09-01", dateIsEstimate: false }),
          entry({ id: "earlier", status: FEATURE_STATUSES.shipped, version: "0.1.0", date: "2026-08-30", dateIsEstimate: false }),
        ]}
      />,
    );
    expect(doc.querySelectorAll("details.group\\/month")).toHaveLength(2);
    expect(doc.body.textContent).toContain("v0.2.0");
  });
});
