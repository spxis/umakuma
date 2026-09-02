/**
 * Japanese era years, and the Western years they name.
 *
 * A learner meets 平成 and 昭和 long before they can read a date: they are on
 * every official form, every coin, and the birth year of anybody Japanese
 * writing about themselves. Working one out means knowing where the era
 * started and subtracting one, which is exactly the arithmetic nobody wants to
 * do in their head while reading.
 *
 * Five eras, back to 明治. Not because the earlier ones do not exist - there
 * are two hundred and more - but because 1868 is where the modern calendar
 * begins, and a date before it is a history question rather than a reading
 * one.
 */

/** An era, as it is written, said and counted. */
export type JapaneseEra = {
  /** The name in kanji, which is how a date is written. */
  kanji: string;
  /** The Latin name, capitalised as English writes it. */
  romaji: string;
  /** The reading, for anyone meeting the kanji for the first time. */
  reading: string;
  /** The Western year the era's first year falls in. */
  startYear: number;
  /**
   * The highest year the era reached, or null while it is still running.
   *
   * 昭和 ran to 64 and 平成 to 31, so 昭和65 is not a date and answering with
   * 1990 would be a wrong answer rather than a missing one.
   */
  lastYear: number | null;
  /**
   * Every spelling the name is written with in Latin letters.
   *
   * The long vowels are the reason there is a list rather than one string:
   * 昭和 is Showa, Shouwa and Shōwa depending on whose romanization somebody
   * learned, and all three are the same era.
   */
  spellings: readonly string[];
};

/**
 * How far an era still running is allowed to be counted.
 *
 * An era year is written with two digits at most - 令和6年, 昭和64年 - so a
 * third digit is a typo rather than a date, and answering 令和500 with the
 * year 2518 would be arithmetic rather than help.
 */
const OPEN_ERA_LIMIT = 99;

export const JAPANESE_ERAS: readonly JapaneseEra[] = [
  {
    kanji: "明治",
    romaji: "Meiji",
    reading: "めいじ",
    startYear: 1868,
    lastYear: 45,
    spellings: ["meiji"],
  },
  {
    kanji: "大正",
    romaji: "Taisho",
    reading: "たいしょう",
    startYear: 1912,
    lastYear: 15,
    spellings: ["taisho", "taishou", "taishō"],
  },
  {
    kanji: "昭和",
    romaji: "Showa",
    reading: "しょうわ",
    startYear: 1926,
    lastYear: 64,
    spellings: ["showa", "shouwa", "shōwa"],
  },
  {
    kanji: "平成",
    romaji: "Heisei",
    reading: "へいせい",
    startYear: 1989,
    lastYear: 31,
    spellings: ["heisei"],
  },
  {
    kanji: "令和",
    romaji: "Reiwa",
    reading: "れいわ",
    startYear: 2019,
    lastYear: null,
    spellings: ["reiwa"],
  },
];

/** An era year that parsed, and the year it names. */
export type EraYear = {
  era: JapaneseEra;
  /** The year within the era, counting from one. */
  year: number;
  /** The Western year it falls in. */
  westernYear: number;
};

/** Full-width digits are what a Japanese keyboard produces. */
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

/**
 * The year an era year falls in.
 *
 * Minus one, because an era's first year is year one rather than year zero:
 * 平成1年 is 1989, the year the era began, not the year after it.
 */
export function westernYearFor(era: JapaneseEra, year: number): number | null {
  if (!Number.isInteger(year) || year < 1) return null;
  const ceiling = era.lastYear ?? OPEN_ERA_LIMIT;
  if (year > ceiling) return null;
  return era.startYear + year - 1;
}

/** The era a name refers to, written either way, or null. */
function eraNamed(name: string): JapaneseEra | null {
  const kanji = JAPANESE_ERAS.find((era) => era.kanji === name);
  if (kanji) return kanji;

  const spelling = name.toLowerCase();
  return JAPANESE_ERAS.find((era) => era.spellings.includes(spelling)) ?? null;
}

/**
 * The era name and the number, however the two were written.
 *
 * The name may be kanji or Latin and the number may sit against it or a space
 * away, because 平成3年 and "Heisei 3" are the same question typed by two
 * people. 年 is optional for the same reason: it is how the date is written,
 * not part of what was asked.
 */
const ERA_QUERY = /^(明治|大正|昭和|平成|令和|[a-zA-ZĀ-ſ]+)\s*(元|\d{1,3})\s*年?$/;

/**
 * The date a query names, or null when it does not name one.
 *
 * 元年 - "first year" - is spelled out rather than numbered on anything
 * official, so it is read as the 1 it means. Everything else is a plain
 * number, half-width or full, with or without the 年 that usually follows it.
 */
export function parseEraYear(raw: string): EraYear | null {
  const query = toHalfWidthDigits(String(raw ?? "").trim());
  const match = ERA_QUERY.exec(query);
  if (!match) return null;

  const era = eraNamed(match[1]!);
  if (!era) return null;

  const year = match[2] === "元" ? 1 : Number(match[2]);
  const westernYear = westernYearFor(era, year);
  return westernYear === null ? null : { era, year, westernYear };
}

/** The date as it is written in Japanese: 平成3年. */
export function formatEraYearJapanese(found: EraYear): string {
  return `${found.era.kanji}${found.year}年`;
}

/** The date as it is written in Latin letters: Heisei 3. */
export function formatEraYearRomaji(found: EraYear): string {
  return `${found.era.romaji} ${found.year}`;
}
