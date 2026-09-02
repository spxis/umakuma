/**
 * The answers a search can work out, as opposed to look up.
 *
 * Every result on the page so far comes from a catalogue: the query is matched
 * against characters, meanings and readings, and rows come back. Some queries
 * are not a request to find anything, though. "Heisei 3" is a request to be
 * told a number, and no catalogue holds it - the search answered with nothing
 * at all, which is the wrong answer to a question that has one.
 *
 * So an answer is a second kind of result, computed rather than found, shown
 * above the catalogues because it is what was asked for. The catalogue rows
 * still run underneath: 令和 is also a word somebody may want the reading of.
 */

import {
  formatEraYearJapanese,
  formatEraYearRomaji,
  parseEraYear,
} from "./japaneseEras";

export const SEARCH_ANSWER_KINDS = {
  era: "era",
} as const;

export type SearchAnswerKind = (typeof SEARCH_ANSWER_KINDS)[keyof typeof SEARCH_ANSWER_KINDS];

export type SearchAnswer = {
  /** Which converter answered; the key a list renders by. */
  kind: SearchAnswerKind;
  /**
   * How the query was read, so a wrong reading is visible rather than
   * mysterious. Somebody who meant something else can see that at a glance
   * instead of wondering where the number came from.
   */
  question: string;
  /** The answer itself, the line the reader came for. */
  value: string;
  /** The same thing written in Japanese, or null when there is no such form. */
  japanese: string | null;
  /** A quiet line under the answer: a reading, a rate, a caveat. */
  detail: string | null;
};

/** The era converter, or nothing when the query is not a date. */
function eraAnswer(query: string): SearchAnswer | null {
  const found = parseEraYear(query);
  if (!found) return null;

  return {
    kind: SEARCH_ANSWER_KINDS.era,
    question: formatEraYearRomaji(found),
    value: String(found.westernYear),
    japanese: formatEraYearJapanese(found),
    detail: found.era.reading,
  };
}

/**
 * Every answer a query earns, best first.
 *
 * A list rather than one answer because the converters do not overlap today
 * and there is no reason they never will - a query could name both a date and
 * an amount - and because a page rendering a list needs no second shape when
 * the second converter arrives.
 */
export function searchAnswers(query: string): SearchAnswer[] {
  return [eraAnswer(query)].filter((answer): answer is SearchAnswer => answer !== null);
}
