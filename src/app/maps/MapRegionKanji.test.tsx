import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SUBJECT_FILER_COPY } from "@/app/shared/studyListCopy";
import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";

import MapRegionKanji from "./MapRegionKanji";

/* The hook talks to the network; the block's job here is what it draws for whom. */
vi.mock("@/app/shared/useSubjectFiler", () => ({
  useFilerOpen: () => [true, () => {}],
  useSubjectFiler: () => ({
    lists: [{ id: "l1", name: "Kanto", items: [] }],
    tagsFor: () => ({ favorite: false, trouble: false, burned: false }),
    toggleTag: () => {},
    toggleList: () => {},
    error: null,
  }),
}));

const facts = {
  高: { meaning: "tall", reading: "コウ" },
  知: { meaning: "know", reading: "チ" },
};

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

function buttonLabels(document: Document): Array<string | null> {
  return [...document.querySelectorAll("button")].map((button) => button.getAttribute("aria-label") ?? button.textContent);
}

/*
 * The characters of a place name are the same pill the kanji page draws the
 * characters of a word with. They were the explorer's large card for a
 * release, which made the map the one page that drew a kanji its own way.
 */
describe("the characters of a place name", () => {
  it("are the shared pill, each a link to the character's own page", () => {
    const document = render(<MapRegionKanji kanji={["高", "知"]} facts={facts} accountId={null} />);
    const links = [...document.querySelectorAll("li > a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/kanji/%E9%AB%98", "/kanji/%E7%9F%A5"]);
    /* A row of pills that wraps, not the explorer's grid of cards. */
    expect(document.querySelector("ul")?.getAttribute("class")).not.toContain("grid");
    expect(links[0]?.textContent).toContain("コウ · tall");
  });

  it("carries the one Text on control every row of pills has", () => {
    const document = render(<MapRegionKanji kanji={["高", "知"]} facts={facts} accountId={null} />);
    expect(buttonLabels(document)).toContain(SUBJECT_PAGE_COPY.pillTextOn);
  });

  it("offers a member the lists under each pill, never inside its link", () => {
    const document = render(<MapRegionKanji kanji={["高", "知"]} facts={facts} accountId="acc-1" />);
    const labels = buttonLabels(document);
    expect(labels).toContain(SUBJECT_FILER_COPY.close);
    expect(labels.filter((label) => label === "Add to Kanto")).toHaveLength(2);
    expect(document.querySelectorAll("a button, button a, button button")).toHaveLength(0);
  });

  it("shows a visitor the pills and no filing at all", () => {
    const document = render(<MapRegionKanji kanji={["高", "知"]} facts={facts} accountId={null} />);
    const labels = buttonLabels(document);
    expect(labels).not.toContain(SUBJECT_FILER_COPY.open);
    expect(labels).not.toContain("Add to Kanto");
  });
});
