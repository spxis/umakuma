import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SEARCH_ANSWER_KINDS, type SearchAnswer } from "@/lib/searchAnswers";

import SearchAnswerBrief from "./SearchAnswerBrief";

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

const ERA: SearchAnswer = {
  kind: SEARCH_ANSWER_KINDS.era,
  question: "Heisei 3",
  value: "1991",
  japanese: "平成3年",
  reading: "へいせい",
  detail: null,
  attribution: null,
  history: null,
};

const CAD: SearchAnswer = {
  kind: SEARCH_ANSWER_KINDS.currency,
  question: "CA$20.00",
  value: "¥2,306",
  japanese: "二千三百六円",
  reading: "にせんさんびゃくろくえん",
  detail: "1 CAD = ¥115.33",
  attribution: { source: "Frankfurter", asOf: "2026-09-01" },
  history: null,
};

const USD: SearchAnswer = { ...CAD, question: "$20.00", value: "¥3,203", japanese: "3,203円" };

/**
 * The answer at the top of the header dropdown.
 *
 * The dropdown is where a query is typed, so it is where the answer is wanted;
 * showing it only on the results page meant "Heisei 3" answered with thirty
 * rows about the number three and nothing else.
 */
describe("SearchAnswerBrief", () => {
  it("shows the value, the Japanese form and the question it answers", () => {
    const document = render(<SearchAnswerBrief answers={[ERA]} />);
    const text = document.body.textContent ?? "";

    expect(text).toContain("1991");
    expect(text).toContain("平成3年");
    expect(text).toContain("Heisei 3");
  });

  it("draws nothing at all when the query worked nothing out", () => {
    expect(render(<SearchAnswerBrief answers={[]} />).body.innerHTML).toBe("");
  });

  /* A dollar sign is two questions, so the two answers must not collide. */
  it("keeps two currency answers apart", () => {
    const document = render(<SearchAnswerBrief answers={[CAD, USD]} />);
    const rows = document.querySelectorAll("[data-search-answer='currency']");

    expect(rows).toHaveLength(2);
    expect(document.body.textContent).toContain("¥2,306");
    expect(document.body.textContent).toContain("¥3,203");
  });

  /* The rate history is a table; a dropdown has no room and never shows one. */
  it("leaves the history and the attribution to the results page", () => {
    const text = render(<SearchAnswerBrief answers={[CAD]} />).body.textContent ?? "";

    expect(text).not.toContain("Frankfurter");
    expect(text).not.toContain("2026-09-01");
  });
});

/*
 * The dropdown draws the value and the Japanese and nothing else, so a reading
 * kept on the quiet line below never reached the surface most searches use.
 * 五百円 still has to be said ごひゃくえん, and that is the half a price tag
 * does not teach.
 */
describe("the reading in the compact answer", () => {
  it("says the amount aloud", () => {
    const doc = render(<SearchAnswerBrief answers={[CAD]} />);
    expect(doc.body.textContent).toContain("にせんさんびゃくろくえん");
  });

  it("says nothing where there is nothing to say", () => {
    const doc = render(<SearchAnswerBrief answers={[{ ...CAD, reading: null }]} />);
    expect(doc.body.textContent).not.toContain("にせん");
  });
});
