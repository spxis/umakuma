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
  const doc = render(
    <ReleaseTimelineList entries={queue} showEstimateFlag queue={{ heading: "In queue order", noun: "planned" }} />,
  );

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

/*
 * A shelf is not a calendar either.
 *
 * Backlogged and cancelled work carries the same hand-typed estimate the queue
 * does, so grouping it by month would reproduce the out-of-order headers the
 * planned tab was fixed for. Every tab but Released is one flat list.
 */
describe("the backlog and cancelled tabs", () => {
  const shelf = [
    entry({ id: "parked", status: FEATURE_STATUSES.backlogged, date: "2026-08-01" }),
    entry({ id: "dropped", status: FEATURE_STATUSES.cancelled, date: "2026-09-01" }),
  ];

  it("names each row's status so the two shelves are told apart", () => {
    const doc = render(
      <ReleaseTimelineList entries={shelf} showStatusFlag queue={{ heading: "Backlog", noun: "parked" }} />,
    );
    expect(doc.body.textContent).toContain("Backlog");
    expect(doc.body.textContent).toContain("Cancelled");
  });

  it("does not group a shelf by month", () => {
    const doc = render(
      <ReleaseTimelineList entries={shelf} showStatusFlag queue={{ heading: "Backlog", noun: "parked" }} />,
    );
    expect(doc.querySelectorAll("details.group\\/month")).toHaveLength(0);
    expect(doc.body.textContent).not.toContain("August");
  });

  it("counts in the tab's own word, not always 'planned'", () => {
    const doc = render(
      <ReleaseTimelineList entries={shelf} queue={{ heading: "Cancelled", noun: "cancelled" }} />,
    );
    expect(doc.querySelector("h3")?.textContent).toContain("2 cancelled");
  });
});

/*
 * "Nothing queued" was the only empty message, and it is wrong on five of the
 * six tabs - an empty Cancelled tab is good news, not an empty queue.
 */
describe("an empty tab", () => {
  it("says what is empty", () => {
    const doc = render(<ReleaseTimelineList entries={[]} emptyMessage="Nothing cancelled." />);
    expect(doc.body.textContent).toContain("Nothing cancelled.");
  });

  it("still has a default for the queue it was written for", () => {
    const doc = render(<ReleaseTimelineList entries={[]} />);
    expect(doc.body.textContent).toContain("Nothing queued.");
  });
});
