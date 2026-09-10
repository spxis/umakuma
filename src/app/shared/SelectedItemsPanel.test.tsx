import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";

import SelectedItemsPanel from "./SelectedItemsPanel";
import { SUBJECT_SELECTION_COPY } from "./subjectSelection";

function draw(element: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(element)}</body>`).window.document;
}

describe("what has been chosen", () => {
  it("is each character as the shared pill, which removes it", () => {
    const doc = draw(<SelectedItemsPanel chosen={new Set(["山", "川"])} subjectType={SUBJECT_TYPES.kanji} onRemove={() => undefined} />);
    const labels = [...doc.querySelectorAll("button")].map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual([`${SUBJECT_SELECTION_COPY.remove} 山`, `${SUBJECT_SELECTION_COPY.remove} 川`]);
  });

  it("folds a long selection to a line and a count", () => {
    const chosen = new Set("一二三四五六七八九十".split(""));
    const doc = draw(<SelectedItemsPanel chosen={chosen} subjectType={SUBJECT_TYPES.kanji} onRemove={() => undefined} />);
    const buttons = [...doc.querySelectorAll("button")];
    expect(buttons).toHaveLength(9);
    expect(buttons[8]?.textContent).toBe("+2");
  });

  it("is nothing while nothing is chosen", () => {
    expect(draw(<SelectedItemsPanel chosen={new Set()} subjectType={SUBJECT_TYPES.kanji} onRemove={() => undefined} />).body.innerHTML).toBe("");
  });
});

/*
 * The chosen glyphs are coloured, which they were not.
 *
 * The set is bare characters, so the panel cannot read the kind off an item
 * and `SubjectPill` fell through to `text-foreground` - every chosen kanji
 * drawn in body-text colour, by the component that exists to prevent that.
 */
it("draws the chosen glyphs in their subject colour", () => {
  const doc = draw(
    <SelectedItemsPanel chosen={new Set(["山"])} subjectType={SUBJECT_TYPES.kanji} onRemove={() => undefined} />,
  );
  const glyph = doc.querySelector('span[lang="ja"]');
  expect(glyph?.textContent).toBe("山");
  expect(glyph?.className).toContain("text-kanji");
  expect(glyph?.className).not.toContain("text-foreground");
});
