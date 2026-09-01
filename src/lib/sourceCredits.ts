/**
 * Where borrowed content came from, in one map.
 *
 * Tatoeba's sentences are CC BY, so their credit is a licence condition and was
 * there from the first page that showed one. WaniKani's meanings, readings and
 * mnemonics are the larger borrowing by far and had no credit anywhere - which
 * is backwards, whether or not their terms compel one. A reader looking at a
 * meaning should be able to see whose meaning it is.
 *
 * `licence` is optional: WaniKani's content is theirs under their own terms
 * rather than under a public licence, so the credit names them and links to
 * them without claiming a licence they have not granted.
 *
 * This file holds no imports on purpose. Tatoeba's credit used to live beside
 * the sentence loader, which is `server-only` because it reaches for Prisma -
 * so a client component that wanted the credit dragged the database client
 * into the browser bundle and the build refused it. A credit is a string and a
 * URL; it belongs where both halves can read it.
 */
export type SourceCredit = {
  source: string;
  url: string;
  licence?: string;
  licenceUrl?: string;
};

export const SOURCE_CREDITS = {
  wanikani: {
    source: "WaniKani",
    url: "https://www.wanikani.com",
  },
  tatoeba: {
    source: "Tatoeba",
    url: "https://tatoeba.org",
    licence: "CC BY 2.0 FR",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
  },
} as const satisfies Record<string, SourceCredit>;

/** The words in front of the link, kept with the other copy for the locale layer. */
export const SOURCE_CREDIT_COPY = {
  subjectData: "Meanings and readings from",
  mnemonics: "Mnemonics from",
  sentences: "Example sentences from",
} as const;
