import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SubjectRows from "./SubjectRows";
import { toSubjectListRow } from "./subjectListView";
import { SRS_BUCKETS, SUBJECT_TYPES } from "@/lib/domainConstants";

/*
 * Split out of `subjectRowLanes.test.tsx` at the line gate. That file is about
 * the lanes and their headings; this one is about choosing from the heading.
 */

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

const ROWS = [
  toSubjectListRow({
    subjectId: 1,
    characters: "水",
    subjectType: SUBJECT_TYPES.kanji,
    meanings: ["Water"],
    primaryReadings: ["すい"],
    wkLevel: 3,
    srsStage: 5,
    status: SRS_BUCKETS.guru,
  }),
  toSubjectListRow({
    subjectId: 2,
    characters: "大人",
    subjectType: SUBJECT_TYPES.vocabulary,
    meanings: ["Adult"],
    readings: ["おとな"],
    wkLevel: 11,
    srsStage: 1,
    status: SRS_BUCKETS.apprentice,
  }),
];

/**
 * The box in the heading, which takes or clears the page.
 *
 * The bar above says "All on this page" in words; the heading is where a
 * reader of a column of checkboxes looks for the one that governs them.
 */
describe("choosing every row from the heading", () => {
  const selection = (chosen: string[], calls: string[]): Parameters<typeof SubjectRows>[0]["selection"] => ({
    choosing: true,
    chosen: new Set(chosen),
    count: chosen.length,
    atLimit: false,
    start: () => {},
    cancel: () => {},
    toggle: () => {},
    extendTo: () => {},
    addAll: () => calls.push("addAll"),
    clear: () => calls.push("clear"),
  });

  const box = (chosen: string[]) => {
    const doc = render(<SubjectRows rows={ROWS} onSelect={() => {}} selection={selection(chosen, [])} />);
    return doc.querySelector('[role="checkbox"]');
  };

  it("is unchecked with nothing chosen", () => {
    expect(box([])?.getAttribute("aria-checked")).toBe("false");
  });

  /* Half-chosen reads as mixed rather than as either. */
  it("is mixed with some chosen", () => {
    expect(box(["水"])?.getAttribute("aria-checked")).toBe("mixed");
  });

  it("is checked with every row chosen", () => {
    expect(box(["水", "大人"])?.getAttribute("aria-checked")).toBe("true");
  });

  it("is not drawn at all while the surface is not choosing", () => {
    const doc = render(<SubjectRows rows={ROWS} onSelect={() => {}} />);
    expect(doc.querySelector('[role="checkbox"]')).toBeNull();
  });
});
