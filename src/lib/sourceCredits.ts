/**
 * Where borrowed content came from, in one registry.
 *
 * Nine sources are borrowed here. Tatoeba's sentences are CC BY, so their
 * credit is a licence condition and was there from the first page that showed
 * one. WaniKani's meanings, readings and mnemonics are the larger borrowing by
 * far and had no credit anywhere - which is backwards, whether or not their
 * terms compel one. A reader looking at a meaning should be able to see whose
 * meaning it is, and now can follow it to a page of ours that says what we
 * hold from that source and when it was last brought in.
 *
 * `licence` is optional: WaniKani's content is theirs under their own terms
 * rather than under a public licence, so the credit names them and links to
 * them without claiming a licence they have not granted. kanjiapi.dev serves
 * EDRDG data whose share-alike terms already sit on the dictionary entry, and
 * is not made to claim the same grant twice.
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

export const SOURCE_KEYS = {
  wanikani: "wanikani",
  kanjidic2: "kanjidic2",
  radkfile: "radkfile",
  kanjivg: "kanjivg",
  kanjiapi: "kanjiapi",
  tatoeba: "tatoeba",
  jmdict: "jmdict",
  jiten: "jiten",
  curriculum: "curriculum",
  jpmap: "jpmap",
  usmap: "usmap",
  worldmap: "worldmap",
} as const;

export const SOURCE_KEY_VALUES = [
  SOURCE_KEYS.wanikani,
  SOURCE_KEYS.kanjidic2,
  SOURCE_KEYS.radkfile,
  SOURCE_KEYS.kanjivg,
  SOURCE_KEYS.kanjiapi,
  SOURCE_KEYS.tatoeba,
  SOURCE_KEYS.jmdict,
  SOURCE_KEYS.jiten,
  SOURCE_KEYS.curriculum,
  SOURCE_KEYS.jpmap,
  SOURCE_KEYS.usmap,
  SOURCE_KEYS.worldmap,
] as const;

export type SourceKey = (typeof SOURCE_KEY_VALUES)[number];

export function isSourceKey(value: string): value is SourceKey {
  return (SOURCE_KEY_VALUES as readonly string[]).includes(value);
}

export const SOURCE_CREDITS: Record<SourceKey, SourceCredit> = {
  [SOURCE_KEYS.wanikani]: {
    source: "WaniKani",
    url: "https://www.wanikani.com",
  },
  [SOURCE_KEYS.kanjidic2]: {
    source: "KANJIDIC2",
    url: "http://www.edrdg.org/wiki/index.php/KANJIDIC_Project",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  [SOURCE_KEYS.radkfile]: {
    source: "RADKFILE",
    url: "http://www.edrdg.org/krad/kradinf.html",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  [SOURCE_KEYS.kanjivg]: {
    source: "KanjiVG",
    url: "https://kanjivg.tagaini.net",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  [SOURCE_KEYS.kanjiapi]: {
    source: "kanjiapi.dev",
    url: "https://kanjiapi.dev",
  },
  [SOURCE_KEYS.tatoeba]: {
    source: "Tatoeba",
    url: "https://tatoeba.org",
    licence: "CC BY 2.0 FR",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
  },
  /*
   * Frequency, not meaning. JMdict's entries carry priority tags drawn from a
   * newspaper corpus - nf01..nf48 in bands of 500, plus the news, ichi, spec
   * and gai common-word lists - and those tags are the whole of what we take.
   * The definitions are theirs and we do not use them.
   */
  [SOURCE_KEYS.jmdict]: {
    source: "JMdict",
    url: "http://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  /*
   * The other half of the same question. A newspaper corpus knows what is
   * written and not what is said, so a word everybody speaks and nobody prints
   * ranks nowhere - which is how 父 and 雨 end up looking rare. Jiten ranks by
   * medium, and the spoken registers are what stop that happening.
   */
  [SOURCE_KEYS.jiten]: {
    source: "Jiten",
    url: "https://jiten.moe",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  [SOURCE_KEYS.curriculum]: {
    source: "MEXT and the Agency for Cultural Affairs",
    url: "https://www.mext.go.jp/a_menu/shotou/new-cs/youryou/syo/koku/001.htm",
  },
  /*
   * The one borrowing on the site whose terms we were actually breaking. GSI
   * ask for two things and we did neither: name them, and say the shapes were
   * edited. Ours are reprojected, simplified and Okinawa is lifted out of the
   * sea into a box, so the edit is not a technicality.
   */
  [SOURCE_KEYS.jpmap]: {
    source: "Global Map Japan (GSI)",
    url: "https://www.gsi.go.jp/kankyochiri/gm_japan_e.html",
    licence: "PDL 1.0",
    licenceUrl: "https://www.gsi.go.jp/ENGLISH/page_e30286.html",
  },
  /*
   * Public domain rather than licensed, so no licence is named: a work of the
   * United States government carries no copyright to grant. us-atlas, which
   * did the TopoJSON conversion, is ISC and is named on the page instead.
   */
  [SOURCE_KEYS.usmap]: {
    source: "U.S. Census Bureau",
    url: "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
  },
  /* "No permission is needed to use Natural Earth. Crediting the authors is
   * unnecessary." Credited anyway, because a reader asking where a border came
   * from deserves the answer whether or not somebody can compel it. */
  [SOURCE_KEYS.worldmap]: {
    source: "Natural Earth",
    url: "https://www.naturalearthdata.com",
  },
};

/** Our own page about a source: what we hold from it, and when it came in. */
export function sourcePath(key: SourceKey): string {
  return `/sources/${key}`;
}

export const SOURCES_HREF = "/sources";

/** The words in front of the link, kept with the other copy for the locale layer. */
export const SOURCE_CREDIT_COPY = {
  subjectData: "Meanings and readings from",
  mnemonics: "Mnemonics from",
  sentences: "Example sentences from",
  words: "Words from",
  relations: "Radicals, look-alikes and vocabulary from",
  strokes: "Stroke data from",
  radicals: "Radical breakdowns from",
  dictionary: "Dictionary data from",
  wordFrequency: "Word frequency from",
  /*
   * "edited" is not decoration. GSI's terms ask that a reader be told the
   * shapes were changed, and every map here is reprojected and simplified.
   */
  mapOutlines: "Region outlines edited from",
  /*
   * The cities are a second provider's dataset on somebody else's outlines:
   * Japan's shapes are GSI's and the United States' are the Census Bureau's,
   * while every city on either map is Natural Earth's. One credit naming only
   * the outlines would be a true sentence that leaves the other holder out.
   */
  mapCities: "Cities from",
} as const;
