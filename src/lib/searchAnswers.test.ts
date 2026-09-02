import { describe, expect, it } from "vitest";

import { SEARCH_ANSWER_KINDS, searchAnswers } from "./searchAnswers";

describe("searchAnswers", () => {
  it("answers an era year with the Western year and the date in kanji", () => {
    const [answer] = searchAnswers("Heisei 3");
    expect(answer).toEqual({
      kind: SEARCH_ANSWER_KINDS.era,
      question: "Heisei 3",
      value: "1991",
      japanese: "平成3年",
      detail: "へいせい",
    });
  });

  /* A date typed in kanji still earns the Latin name; that is half the answer. */
  it("names the era in Latin letters for a query written in kanji", () => {
    const [answer] = searchAnswers("令和6年");
    expect(answer?.question).toBe("Reiwa 6");
    expect(answer?.value).toBe("2024");
    expect(answer?.japanese).toBe("令和6年");
  });

  it("answers nothing for a query that only the catalogues can answer", () => {
    expect(searchAnswers("morning")).toEqual([]);
    expect(searchAnswers("日")).toEqual([]);
    expect(searchAnswers("")).toEqual([]);
  });

  /*
   * A year an era never reached has no answer, and the catalogues still run
   * underneath - so the page shows what they found rather than a wrong date.
   */
  it("answers nothing for a date that never happened", () => {
    expect(searchAnswers("Showa 65")).toEqual([]);
  });
});
