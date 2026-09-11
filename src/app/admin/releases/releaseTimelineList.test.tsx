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
    status: FEATURE_STATUSES.shipped,
    date: "2026-09-01",
    summary: "Something shipped.",
    ...overrides,
  };
}

/*
 * The file holds shipped work only, so the list has one shape: grouped by the
 * month it shipped, where the date is a fact worth heading with. The queue,
 * backlog and cancelled tabs that once shared this component read a file that
 * could no longer hold them, and are gone.
 */
describe("the released tab", () => {
  it("groups what shipped by the month it shipped", () => {
    const doc = render(
      <ReleaseTimelineList
        entries={[
          entry({ id: "later", version: "0.2.0", date: "2026-09-01" }),
          entry({ id: "earlier", version: "0.1.0", date: "2026-08-30" }),
        ]}
      />,
    );
    expect(doc.querySelectorAll("details.group\\/month")).toHaveLength(2);
    expect(doc.body.textContent).toContain("v0.2.0");
    expect(doc.body.textContent).toContain("August");
  });

  it("marks a bug as one", () => {
    const doc = render(<ReleaseTimelineList entries={[entry({ id: "fix", version: "0.3.0", kind: "bug" })]} />);
    expect(doc.body.textContent).toContain("Bug");
  });
});

describe("an empty list", () => {
  it("says what is empty, and has a default for the tab it was written for", () => {
    expect(render(<ReleaseTimelineList entries={[]} emptyMessage="Nothing here." />).body.textContent).toContain("Nothing here.");
    expect(render(<ReleaseTimelineList entries={[]} />).body.textContent).toContain("Nothing released yet.");
  });
});
