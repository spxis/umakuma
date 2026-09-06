import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StudyTagListsBody from "./StudyTagListsBody";
import { SUBJECT_VIEW_MODES } from "./subjectListView";
import { STUDY_TAG_LIST_COPY } from "./studyTagListsUi";
import { SRS_BUCKETS, SUBJECT_TYPES } from "@/lib/domainConstants";
import type { StudyTagListItem } from "@/lib/studyTagLists";

/**
 * Turning Edit on must not move the list under the reader.
 *
 * The invitation to write a note used to appear as a line under the meaning,
 * so every row grew when Edit was pressed and the whole page shifted. It is a
 * control, so it sits with the other controls - in the row's trailing lane -
 * and the row is exactly as tall either way.
 */
function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

const ITEMS = [
  {
    assignmentId: -1,
    queueType: "review",
    subjectId: 1,
    subjectType: SUBJECT_TYPES.kanji,
    characters: "手",
    meanings: ["Hand"],
    readings: ["て"],
    srsStage: 9,
    status: SRS_BUCKETS.burned,
    availableAt: null,
    studyTags: { favorite: false, trouble: false, burned: true },
  },
] as unknown as StudyTagListItem[];

const body = (editing: boolean) =>
  render(
    <StudyTagListsBody
      items={ITEMS}
      viewMode={SUBJECT_VIEW_MODES.list}
      onOpen={() => {}}
      noteFor={() => null}
      onRemove={editing ? () => {} : undefined}
      onEditNote={editing ? () => {} : undefined}
      reserveControls
    />,
  );

describe("a list row under an Edit toggle", () => {
  it("says nothing extra under the meaning while editing", () => {
    expect(body(true).body.textContent).not.toContain(STUDY_TAG_LIST_COPY.addNote);
  });

  /* The invitation is there - as a control, in the lane the × already uses. */
  it("offers the note as a button beside the remove control", () => {
    const labels = [...body(true).querySelectorAll("button")].map((el) => el.getAttribute("aria-label") ?? "");
    expect(labels.some((label) => label.startsWith(STUDY_TAG_LIST_COPY.addNote))).toBe(true);
    expect(labels.some((label) => label.startsWith(STUDY_TAG_LIST_COPY.remove))).toBe(true);
  });

  /* Same lanes, same rows, whether or not the toggle is on. */
  it("keeps the controls' lane open when the toggle is off", () => {
    const off = body(false).querySelectorAll("li").length;
    const on = body(true).querySelectorAll("li").length;
    expect(off).toBe(on);
    expect(body(false).querySelectorAll("button").length).toBeLessThan(body(true).querySelectorAll("button").length);
  });
});
