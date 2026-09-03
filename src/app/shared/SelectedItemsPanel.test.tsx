import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SelectedItemsPanel from "./SelectedItemsPanel";
import { SUBJECT_SELECTION_COPY } from "./subjectSelection";

function draw(element: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(element)}</body>`).window.document;
}

describe("what has been chosen", () => {
  it("is each character as the shared pill, which removes it", () => {
    const doc = draw(<SelectedItemsPanel chosen={new Set(["山", "川"])} onRemove={() => undefined} />);
    const labels = [...doc.querySelectorAll("button")].map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual([`${SUBJECT_SELECTION_COPY.remove} 山`, `${SUBJECT_SELECTION_COPY.remove} 川`]);
  });

  it("folds a long selection to a line and a count", () => {
    const chosen = new Set("一二三四五六七八九十".split(""));
    const doc = draw(<SelectedItemsPanel chosen={chosen} onRemove={() => undefined} />);
    const buttons = [...doc.querySelectorAll("button")];
    expect(buttons).toHaveLength(9);
    expect(buttons[8]?.textContent).toBe("+2");
  });

  it("is nothing while nothing is chosen", () => {
    expect(draw(<SelectedItemsPanel chosen={new Set()} onRemove={() => undefined} />).body.innerHTML).toBe("");
  });
});
