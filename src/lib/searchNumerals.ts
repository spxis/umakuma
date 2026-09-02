/**
 * Digits, read as the numbers they are.
 *
 * "1" found nothing at all. Not a near miss - nothing: the catalogues hold 一
 * and the meaning "One", and neither of them contains the character 1, so a
 * substring search over characters, readings and meanings had nothing to
 * match. Typing a digit is a reasonable way to look a number up, and every
 * dictionary a learner has used answers it.
 *
 * So a digit is offered to the search as the character it is written with and
 * as its English name, alongside the digit itself. The rest of the search is
 * unchanged: these are extra spellings to match against, not a different query.
 */

const DIGIT_KANJI = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

/** The English names, since the catalogues write meanings as words. */
const DIGIT_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

/**
 * The powers Japanese gives a character of its own.
 *
 * Numbers are built from these rather than from digits in a row: ten is 十,
 * not 一〇, and twenty-four is 二十四. Anything above 万 is past what somebody
 * is looking a character up for.
 */
const UNITS: Array<{ value: number; kanji: string }> = [
  { value: 10_000, kanji: "万" },
  { value: 1_000, kanji: "千" },
  { value: 100, kanji: "百" },
  { value: 10, kanji: "十" },
];

/** Above this the spelling is long and matches nothing, so nothing is offered. */
const LARGEST_USEFUL = 99_999_999;

/** Full-width digits are what a Japanese keyboard produces. */
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

/**
 * A thousands comma is punctuation inside a number, not a break between two.
 *
 * Reading runs of digits, `5,000` came apart into 5 and 000 and offered the
 * kanji for five and for zero - which is why a search for a price found 零
 * first. The money parser has always dropped the comma before reading an
 * amount; the same rule belongs here, and the two now agree about what a
 * number is.
 *
 * Only where it separates thousands: a comma between other digits is somebody
 * listing two numbers, and joining those would invent a third.
 */
function withoutThousandsCommas(value: string): string {
  return value.replace(/(\d),(?=\d{3}\b)/g, "$1");
}

/**
 * The number written the way Japanese writes it.
 *
 * The leading one is dropped where the language drops it - 十 rather than 一十
 * for ten - but kept above a hundred, which is why the two cases are separate
 * rather than one clever loop.
 */
export function toJapaneseNumber(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > LARGEST_USEFUL) return null;
  if (value < 10) return DIGIT_KANJI[value] ?? null;

  let remaining = value;
  let out = "";

  for (const unit of UNITS) {
    const count = Math.floor(remaining / unit.value);
    if (count === 0) continue;
    remaining -= count * unit.value;

    /* 十 and 百 lead without their one; 千 and 万 keep it above one thousand. */
    const leading = count === 1 && unit.value <= 1_000 ? "" : (toJapaneseNumber(count) ?? "");
    out += `${leading}${unit.kanji}`;
  }

  if (remaining > 0) out += DIGIT_KANJI[remaining] ?? "";
  return out || null;
}

/**
 * Every extra spelling a query's digits are worth searching for.
 *
 * Each run of digits in the text is read on its own, so "2 people" offers 二
 * and a bare "1" offers 一 and "one". A single digit also offers its English
 * name, because that is how the catalogues write the meaning; a longer number
 * does not, since "twenty-four" is not what any of them hold.
 */
export function japaneseNumberVariants(query: string): string[] {
  const text = withoutThousandsCommas(toHalfWidthDigits(query));
  const runs = text.match(/\d+/g);
  if (!runs) return [];

  const variants = new Set<string>();
  for (const run of runs) {
    const value = Number(run);
    if (!Number.isFinite(value)) continue;

    const kanji = toJapaneseNumber(value);
    if (kanji) {
      variants.add(kanji);
      /*
       * And the characters it is written with.
       *
       * 五千 is the right answer to "5000" and no catalogue holds it: the
       * spelling of a compound number is not a subject anywhere, so searching
       * it exactly found nothing at all and the query looked broken. The
       * characters are held - 五 and 千 are both taught - and they are what
       * somebody asking how to write five thousand needs to see.
       */
      if (kanji.length > 1) for (const char of kanji) variants.add(char);
    }

    /*
     * A round number is offered bare as well as spelled out. Ten thousand is
     * written 一万, but the character somebody typing 10000 is looking for is
     * 万 - and it is the one the catalogues teach.
     */
    const unit = UNITS.find((entry) => entry.value === value);
    if (unit) variants.add(unit.kanji);

    if (value < 10) {
      const word = DIGIT_WORDS[value];
      if (word) variants.add(word);
    }
  }

  return Array.from(variants);
}
