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
  aFewRows: "A few rows",
  rowsChosen: "Chosen from the data, not taken off the top.",
  allSources: "All sources",
  notFound: "No source is recorded under that name.",
} as const;

/**
 * The mapped-country panels under a map source's report.
 *
 * Here rather than in the component for the reason every other string is: this
 * map is the en-CA dictionary a locale layer will swap. "Catalogue" is the
 * Canadian spelling, and the tier a country sits in is named the same way in
 * the summary chips and on its own card.
 */
export const MAPPED_COUNTRIES_COPY = {
  heading: "Mapped country",
  worldHeading: "Countries mapped from Natural Earth",
  worldLede: (countries: number) =>
    `${countries} countries and administrative divisions with full boundary geometry`,
  /** Beside a count, in the summary row above the grid. */
  tierSummary: { public: "Public", pilot: "Admin pilot", catalog: "Catalogue" },
  /** On a country's own card, where the count is the country itself. */
  tierBadge: { public: "Public", pilot: "Pilot", catalog: "Catalogue" },
  flagLabel: (country: string) => `${country} flag`,
  regionsOf: (count: number, plural: string) => `${count} ${plural.toLowerCase()}`,
  japan: {
    name: "Japan (日本)",
    detail: "Outlines provided by Global Map Japan (GSI)",
  },
  unitedStates: {
    name: "United States",
    detail: "50 states and the District of Columbia · Cartographic boundary TopoJSON from U.S. Census Bureau",
  },
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
  [SOURCE_KEYS.jmdict]: {
    tab: "JMdict",
    lede: "The Electronic Dictionary Research and Development Group's Japanese-English dictionary. We take none of its definitions — only the frequency tags it carries, which say how common a word is in a newspaper corpus.",
    takes: [
      "Which frequency band a word falls in, in steps of 500",
      "Whether a word is among the commonest 12,000 or 24,000 in print",
      "Membership of the standard common-word lists",
    ],
    terms: "Creative Commons Attribution-ShareAlike 4.0. The credit is a condition of use, and so is sharing any derived data under the same terms.",
  },
  [SOURCE_KEYS.jiten]: {
    tab: "Jiten",
    lede: "An open project that counts how often words appear across 16,232 works of Japanese media, and publishes a frequency list for each medium. It answers what a newspaper corpus cannot: what people actually say.",
    takes: [
      "How common a word is in anime, drama and film subtitles",
      "The same for novels, manga, games and visual novels",
      "A combined rank across every medium at once",
    ],
    terms: "Creative Commons Attribution-ShareAlike 4.0. The credit is a condition of use, and so is sharing any derived data under the same terms.",
  },
  [SOURCE_KEYS.curriculum]: {
    tab: "School grades",
    lede: "Japan's official kanji tables: the elementary and secondary curricula from the Ministry of Education, the joyo list and the name-kanji list from the Agency for Cultural Affairs.",
    takes: ["Which kanji are taught in which school year", "The readings approved for each grade", "The name kanji permitted in registered names"],
    terms: "Government publications, reproduced as reference data. The curated meanings written over them are our own.",
  },
  /*
   * Three map sources rather than one, because the licences are three and a
   * credit that pooled them would name the wrong holder on two maps out of
   * three. Each country's board credits its own.
   */
  [SOURCE_KEYS.jpmap]: {
    tab: "Japan map",
    lede: "The Geospatial Information Authority of Japan's Global Map, which is where the 47 prefecture outlines come from. The shapes on the board are theirs; the projection, the simplification and Okinawa's box are ours.",
    takes: [
      "The outline of every prefecture, and which prefectures border which",
      "Nothing else: the capitals, populations and rankings beside a map are compiled from the Statistics Bureau, the Agency for Cultural Affairs, the Ministry of Justice and JNTO",
    ],
    terms:
      "Geospatial Information Authority of Japan website terms, which ask for two things: that the source be named, and that a reader be told the data was edited. Ours are reprojected to the board's canvas, simplified, and Okinawa is moved out of the sea into an inset box, so both are said wherever a map is drawn.",
  },
  [SOURCE_KEYS.usmap]: {
    tab: "US map",
    lede: "The Census Bureau's cartographic state boundaries, reaching us as TopoJSON through Mike Bostock's us-atlas. Neighbouring states share arcs in that format, which is how the game knows whose border touches whose.",
    takes: [
      "The outline of every state and the District of Columbia, and which of them border which",
      "Nothing else: the capitals, populations and nicknames are compiled from Census figures and state tourism material",
    ],
    terms:
      "A work of the United States government, in the public domain, so no licence is named and none was granted — there was nothing to grant. The conversion to TopoJSON is us-atlas, under the ISC licence. Credited because a reader asking where a border came from deserves an answer, not because anyone can compel it.",
  },
  [SOURCE_KEYS.worldmap]: {
    tab: "World maps",
    lede: "Natural Earth's public-domain cultural vector dataset, which is where our Canada and world regional maps come from. While the United States uses Census TopoJSON and Japan uses GSI Global Map data, Natural Earth provides the administrative division boundaries (states, provinces, prefectures, and territories) for Canada, our admin pilot countries (Thailand, China, Australia, and Taiwan), and 25 additional global countries in our world map library. Their Populated Places dataset supplies the cities Canada's map can draw over those boundaries. Neighbours are worked out from shared boundary points rather than predefined topology.",
    takes: [
      "The boundary outlines and regional shapes for Canada, Thailand, China, Australia, Taiwan, and 25 additional world countries",
      "Neighbouring divisions calculated from shared vertex boundaries, determining which regions border each other for quiz questions and plausible distractors",
      "From their Populated Places dataset, the position, name, importance rank and capital status of Canada's cities, projected onto our own canvas so a city sits on the province it belongs to",
      "Nothing else: native names, readings, flags, and demographic facts are compiled from national statistical agencies, geographic authorities, and reference encyclopedias",
    ],
    terms:
      "Public domain. Natural Earth's own terms state that no permission is needed and that crediting the authors is unnecessary; they are credited here anyway because readers deserve to know where every boundary on our maps originates.",
  },
};
