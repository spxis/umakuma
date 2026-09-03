/**
 * A number written in words, read as the number it is.
 *
 * "five hundred yen" names a price as clearly as "500 yen" does, and the money
 * parser wanted digits: an amount spelled out answered with nothing at all.
 * Prices are spoken and written in words constantly - a menu says two thousand
 * yen, a listing says twenty thousand - and a learner typing what they heard
 * got a blank page for it.
 *
 * The Japanese magnitudes are here in romaji for the same reason. Somebody
 * types "5 man yen" long before they can type 5万円, and the two mean the same
 * thing; refusing the one they can type while accepting the one they cannot is
 * backwards.
 *
 * Words only: `japaneseNumbers` reads 一億二千万 and the digits, and the two
 * meet in the money parser rather than in each other.
 */

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Multiplies what has been counted so far rather than adding to it. */
const HUNDRED = 100;

/**
 * The magnitudes that close a group and start a new one.
 *
 * English and Japanese in one table because a query mixes them freely - "5 man
 * yen" is a Japanese magnitude with a Latin digit - and because keeping two
 * tables would mean two places to forget that 万 is ten thousand rather than a
 * million.
 */
const SCALES: Record<string, number> = {
  thousand: 1e3,
  million: 1e6,
  billion: 1e9,
  /* Romaji, as a learner types them: sen, man, oku, chou. */
  sen: 1e3,
  man: 1e4,
  oku: 1e8,
  chou: 1e12,
  cho: 1e12,
};

/** Words that carry no value and are simply how the language joins numbers. */
const FILLER = new Set(["and", "a"]);

/**
 * The value of a number written in words, or null when it is not one.
 *
 * Digits are allowed inside it - "5 man", "20 thousand" - since that is how
 * somebody actually types a magnitude they know the name of. Anything the
 * table does not hold makes the whole thing null rather than a partial
 * reading: "five cats" is not five, and answering as though it were would be
 * a confident wrong answer to a question nobody asked.
 */
export function parseEnglishNumber(text: string): number | null {
  const tokens = text
    .toLowerCase()
    .replace(/,/g, "")
    .split(/[\s-]+/)
    .filter((token) => token.length > 0 && !FILLER.has(token));

  if (tokens.length === 0) return null;

  let total = 0;
  let group = 0;
  let counted = false;

  for (const token of tokens) {
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      group += Number(token);
      counted = true;
      continue;
    }

    const ones = ONES[token];
    if (ones !== undefined) {
      group += ones;
      counted = true;
      continue;
    }

    const tens = TENS[token];
    if (tens !== undefined) {
      group += tens;
      counted = true;
      continue;
    }

    if (token === "hundred") {
      /* "hundred" on its own is one hundred, the way "百" is. */
      group = (group || 1) * HUNDRED;
      counted = true;
      continue;
    }

    const scale = SCALES[token];
    if (scale !== undefined) {
      total += (group || 1) * scale;
      group = 0;
      counted = true;
      continue;
    }

    return null;
  }

  if (!counted) return null;

  const value = total + group;
  return Number.isFinite(value) ? value : null;
}

/** Whether the text is a number in words, cheaply enough to ask before parsing. */
export function looksLikeEnglishNumber(text: string): boolean {
  return parseEnglishNumber(text) !== null;
}
