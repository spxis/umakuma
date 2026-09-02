import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { subjectPageHit } from "@/lib/subjectFiler";

import SubjectFilingBar from "./SubjectFilingBar";
import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

/* The hook talks to the network; the bar's job here is what it draws for whom. */
vi.mock("@/app/shared/useSubjectFiler", () => ({
  useSubjectFiler: () => ({
    lists: [{ id: "l1", name: "Week 1", items: [] }],
    tagsFor: () => ({ favorite: false, trouble: false, burned: false }),
    toggleTag: () => {},
    toggleList: () => {},
    error: null,
  }),
}));

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

const hit = subjectPageHit({ subjectType: SUBJECT_TYPES.kanji, characters: "億", slug: "億", subjectId: 695 });

/*
 * The bar is the answer to "I am reading this page and want to keep it". A
 * visitor gets the offer instead, because filing needs somewhere to file into.
 */
describe("the filing bar", () => {
  it("offers the marks and the member's lists to a member", () => {
    const document = render(<SubjectFilingBar hit={hit} accountId="acc-1" label="億" />);
    const labels = [...document.querySelectorAll("button")].map((button) => button.getAttribute("aria-label"));
    expect(labels).toContain("Toggle trouble");
    expect(labels).toContain("Toggle favourite");
    expect(labels).toContain("Add to Week 1");
    expect(document.querySelector("a")).toBeNull();
  });

  it("offers a visitor the reason to join, and no controls", () => {
    const document = render(<SubjectFilingBar hit={hit} accountId={null} label="億" />);
    expect(document.querySelectorAll("button")).toHaveLength(0);
    expect(document.querySelector("a")?.getAttribute("href")).toBe("/join");
    expect(document.body.textContent).toContain(SUBJECT_PAGE_COPY.filingSignedOut("億"));
  });

  /* A kanji the catalogue has never heard of can still go on a list. */
  it("keeps the list chips for a subject with no WaniKani id", () => {
    const unknown = subjectPageHit({ subjectType: SUBJECT_TYPES.kanji, characters: "兀" });
    const document = render(<SubjectFilingBar hit={unknown} accountId="acc-1" label="兀" />);
    const labels = [...document.querySelectorAll("button")].map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual(["Add to Week 1"]);
  });
});
