import { SOURCE_KEYS, type SourceKey } from "@/lib/sourceCredits";

/** Copy for the sources pages, in one map for the locale layer. */
export const SOURCES_COPY = {
  title: "Sources",
  subtitle: "Where UmaKuma's content comes from, and what we hold from each.",
  intro:
    "Every meaning, reading, stroke and sentence on the site was made by somebody else first. These are the sources, what we keep from each, and when it last came in.",
  whatWeHold: "What we hold",
  lastImported: "Last brought in",
  upstreamVersion: "Their release",
  terms: "Terms",
  visit: "Visit",
  whatWeTake: "What we take",
  allSources: "All sources",
  notFound: "No source is recorded under that name.",
} as const;

/**
 * What each source is, in a sentence, and what of it we take.
 *
 * The takings are lists rather than prose so a reader can check a fact on a
 * page against the source it came from: a meaning is WaniKani's or KANJIDIC2's,
 * never both.
 */
export const SOURCE_DESCRIPTIONS: Record<
  SourceKey,
  { tab: string; lede: string; takes: string[]; terms: string }
> = {
  [SOURCE_KEYS.wanikani]: {
    tab: "WaniKani",
    lede: "The kanji-learning service whose curriculum a member studies through. Its catalogue of subjects is synced into ours; a member's own progress is read live from their account.",
    takes: [
      "Radicals, kanji and vocabulary, with their levels",
      "Meanings, readings and mnemonics",
      "How subjects relate: what is built from what, and what looks alike",
      "A member's SRS stages and review timing, where they connect an account",
    ],
    terms: "WaniKani's content is theirs under their own terms. It is shown to members studying with it and credited wherever it appears.",
  },
  [SOURCE_KEYS.kanjidic2]: {
    tab: "KANJIDIC2",
    lede: "The Electronic Dictionary Research and Development Group's kanji dictionary: every character with every meaning and reading, built into the site as a file.",
    takes: [
      "Meanings, on and kun readings, and the readings only names use",
      "Stroke counts, school grades and newspaper frequency ranks",
      "The pre-2010 JLPT level, for characters the current tables skip",
    ],
    terms: "Creative Commons Attribution-ShareAlike 4.0. The credit is a condition of use, and so is sharing any derived data under the same terms.",
  },
  [SOURCE_KEYS.radkfile]: {
    tab: "RADKFILE",
    lede: "Michael Raine's analysis of which elements every JIS kanji is built from, maintained by the EDRDG. It is what the radical lookup in the search box asks: pick the parts you can see, get the characters that hold all of them.",
    takes: [
      "The 253 classical radicals, with the stroke count of each",
      "Which of them every one of 6,355 kanji is written from",
    ],
    terms: "Creative Commons Attribution-ShareAlike 4.0, the same terms as KANJIDIC2. The credit is a condition of use, and so is sharing any derived data under them.",
  },
  [SOURCE_KEYS.kanjivg]: {
    tab: "KanjiVG",
    lede: "Ulrich Apel's stroke-order project: each character as the strokes a hand makes, in order, which is what the stroke animations draw.",
    takes: ["The stroke shapes and their writing order", "Stroke counts, where they disagree with the dictionary's"],
    terms: "Creative Commons Attribution-ShareAlike 3.0. The credit is a condition of use.",
  },
  [SOURCE_KEYS.kanjiapi]: {
    tab: "kanjiapi.dev",
    lede: "A public API over the EDRDG dictionaries, used once per character to enrich the JLPT table with compounds and keywords.",
    takes: ["The words each kanji appears in, with readings and glosses", "Heisig keywords and frequency ranks"],
    terms: "The data behind it is EDRDG's, under the same share-alike terms as KANJIDIC2; the API itself is credited as the thing read.",
  },
  [SOURCE_KEYS.tatoeba]: {
    tab: "Tatoeba",
    lede: "A collaborative corpus of sentences and their translations, contributed by volunteers. The example sentences on every subject page are theirs.",
    takes: ["Japanese sentences with English translations", "Which kanji each sentence contains, so a character can find its examples"],
    terms: "Creative Commons Attribution 2.0 France. Each sentence links back to its page on Tatoeba, where its contributor is named.",
  },
  [SOURCE_KEYS.curriculum]: {
    tab: "School grades",
    lede: "Japan's official kanji tables: the elementary and secondary curricula from the Ministry of Education, the joyo list and the name-kanji list from the Agency for Cultural Affairs.",
    takes: ["Which kanji are taught in which school year", "The readings approved for each grade", "The name kanji permitted in registered names"],
    terms: "Government publications, reproduced as reference data. The curated meanings written over them are our own.",
  },
};
