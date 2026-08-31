/**
 * Romaji-to-kana folding for search.
 *
 * A learner without an IME types "watashi" and means わたし. Readings are
 * stored in kana, so without this fold the Latin spelling matches nothing and
 * the search box's own placeholder ("or romaji") was a promise the code did
 * not keep. The fold is deliberately a lookup table, not a linguistics
 * library: same input, same output, testable without a DOM.
 *
 * Hepburn spellings are primary (shi, chi, tsu, fu, ji) with the common
 * kunrei alternatives (si, ti, tu, hu, zi) accepted alongside them.
 */

/** Longest-match syllable table; ordered lookups happen by key length. */
const ROMAJI_SYLLABLES: Record<string, string> = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
  ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", sya: "しゃ", syu: "しゅ", syo: "しょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", jya: "じゃ", jyu: "じゅ", jyo: "じょ",
  zya: "じゃ", zyu: "じゅ", zyo: "じょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  vu: "ゔ",
  "-": "ー",
};

const SYLLABLE_KEY_LENGTHS = [3, 2, 1];
const VOWELS = new Set(["a", "i", "u", "e", "o"]);

/** Macron spellings fold to the doubled-vowel forms the table understands. */
const MACRONS: Record<string, string> = { "ā": "aa", "ī": "ii", "ū": "uu", "ē": "ee", "ō": "ou" };

/**
 * The whole string as hiragana, or null when any of it will not convert.
 *
 * Null rather than a partial result on purpose: "sun" converting to すん and
 * then outranking the meaning match for 日 would make folding a bug. A query
 * only gains a kana variant when every character reads as romaji.
 */
export function romajiToHiragana(raw: string): string | null {
  let input = raw.toLowerCase();
  for (const [macron, plain] of Object.entries(MACRONS)) {
    input = input.split(macron).join(plain);
  }

  let out = "";
  let index = 0;
  while (index < input.length) {
    const char = input[index];

    /* ん: n or m before a consonant, n' always, a trailing n or nn. */
    if (char === "n" || char === "m") {
      const next = input[index + 1];
      if (char === "n" && next === "'") {
        out += "ん";
        index += 2;
        continue;
      }
      const nasal =
        next === undefined
          ? char === "n"
          : char === "n"
            ? !VOWELS.has(next) && next !== "y"
            : next === "b" || next === "p" || next === "m";
      if (nasal) {
        out += "ん";
        index += 1;
        if (input.slice(index) === "n") index += 1;
        continue;
      }
    }

    /* っ: a doubled consonant, plus Hepburn's t-before-ch. */
    const next = input[index + 1];
    if (
      next !== undefined &&
      char === next &&
      !VOWELS.has(char) &&
      char !== "n" &&
      char !== "-" &&
      char !== "'"
    ) {
      out += "っ";
      index += 1;
      continue;
    }
    if (char === "t" && input.startsWith("tch", index)) {
      out += "っ";
      index += 1;
      continue;
    }

    let matched = false;
    for (const length of SYLLABLE_KEY_LENGTHS) {
      const candidate = input.slice(index, index + length);
      const kana = ROMAJI_SYLLABLES[candidate];
      if (kana !== undefined) {
        out += kana;
        index += length;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }

  return out.length > 0 ? out : null;
}

export function hiraganaToKatakana(value: string): string {
  return value.replace(/[ぁ-ゖ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

export function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/**
 * Every spelling a query should match under: the raw text, plus kana
 * renderings when the text is romaji, plus the sibling script when it is
 * already kana - JLPT stores on'yomi in katakana, so わたし and ワタシ and
 * "watashi" must all reach the same rows.
 */
export function searchQueryVariants(query: string): string[] {
  const variants = new Set<string>([query]);

  if (/^[a-zA-ZāīūēōĀĪŪĒŌ'-]+$/.test(query)) {
    const hiragana = romajiToHiragana(query);
    if (hiragana) {
      variants.add(hiragana);
      variants.add(hiraganaToKatakana(hiragana));
    }
  }

  if (/[ぁ-ゖ]/.test(query)) variants.add(hiraganaToKatakana(query));
  if (/[ァ-ヶ]/.test(query)) variants.add(katakanaToHiragana(query));

  return Array.from(variants);
}
