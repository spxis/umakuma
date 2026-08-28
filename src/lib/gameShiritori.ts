/**
 * Kana-chain rules for Shiritori.
 *
 * The WaniKani vocabulary a family member has actually started is a small pool
 * (often a few hundred words), so the matching rules here are deliberately the
 * lenient variant of shiritori:
 *
 * - katakana and hiragana are treated as the same kana
 * - dakuten/handakuten are ignored when matching (が chains from か)
 * - small kana normalize to their large form (ょ chains as よ)
 * - a trailing long vowel mark resolves to the vowel it lengthens (コーヒー → い)
 * - words whose reading ends in ん can never be a target, so a chain only ends
 *   when the pool has no remaining continuation
 */

const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;
const LONG_VOWEL_MARK = "ー";

const SMALL_TO_LARGE_KANA: Record<string, string> = {
  ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
  ゃ: "や", ゅ: "ゆ", ょ: "よ", ゎ: "わ", っ: "つ",
};

const VOICED_TO_PLAIN_KANA: Record<string, string> = {
  が: "か", ぎ: "き", ぐ: "く", げ: "け", ご: "こ",
  ざ: "さ", じ: "し", ず: "す", ぜ: "せ", ぞ: "そ",
  だ: "た", ぢ: "ち", づ: "つ", で: "て", ど: "と",
  ば: "は", び: "ひ", ぶ: "ふ", べ: "へ", ぼ: "ほ",
  ぱ: "は", ぴ: "ひ", ぷ: "ふ", ぺ: "へ", ぽ: "ほ",
  ゔ: "う",
};

const KANA_BY_VOWEL: Record<string, string> = {
  あ: "あかさたなはまやらわ",
  い: "いきしちにひみり",
  う: "うくすつぬふむゆる",
  え: "えけせてねへめれ",
  お: "おこそとのほもよろを",
};

const VOWEL_BY_KANA: Record<string, string> = Object.fromEntries(
  Object.entries(KANA_BY_VOWEL).flatMap(([vowel, kana]) => [...kana].map((character) => [character, vowel])),
);

const CHAIN_TERMINATOR = "ん";

function isChainableKana(character: string): boolean {
  return character in VOWEL_BY_KANA || character === CHAIN_TERMINATOR;
}

/** Katakana to hiragana, dropping anything that is not kana or a long vowel mark. */
export function normalizeShiritoriReading(reading: string): string {
  let output = "";
  for (const character of reading.trim()) {
    const code = character.codePointAt(0) ?? 0;
    if (code >= KATAKANA_START && code <= KATAKANA_END) {
      output += String.fromCodePoint(code - KATAKANA_TO_HIRAGANA_OFFSET);
      continue;
    }
    if (character === LONG_VOWEL_MARK || SMALL_TO_LARGE_KANA[character] || isChainableKana(character) || VOICED_TO_PLAIN_KANA[character]) {
      output += character;
    }
  }
  return output;
}

/** Collapses a single kana to the key both ends of a chain are compared on. */
function toChainKey(character: string): string | null {
  const large = SMALL_TO_LARGE_KANA[character] ?? character;
  const plain = VOICED_TO_PLAIN_KANA[large] ?? large;
  return isChainableKana(plain) ? plain : null;
}

/** The kana a following word must start with, or null when the reading dead-ends. */
export function shiritoriTailKey(reading: string): string | null {
  const normalized = normalizeShiritoriReading(reading);
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const character = normalized[index]!;
    if (character === LONG_VOWEL_MARK) {
      // Walk back to the kana this mark lengthens and chain from its vowel.
      for (let previous = index - 1; previous >= 0; previous -= 1) {
        const key = toChainKey(normalized[previous]!);
        if (key && key !== CHAIN_TERMINATOR) return VOWEL_BY_KANA[key] ?? null;
      }
      return null;
    }
    const key = toChainKey(character);
    if (!key) continue;
    return key === CHAIN_TERMINATOR ? null : key;
  }
  return null;
}

/** The kana a reading starts on, used to test whether it continues a chain. */
export function shiritoriHeadKey(reading: string): string | null {
  const normalized = normalizeShiritoriReading(reading);
  for (const character of normalized) {
    const key = toChainKey(character);
    if (key) return key;
  }
  return null;
}

export function shiritoriReadingContinues(reading: string, chainKey: string): boolean {
  return shiritoriHeadKey(reading) === chainKey;
}

/** A word is a usable target only when it continues the chain and does not dead-end. */
export function shiritoriReadingIsPlayable(reading: string, chainKey: string): boolean {
  return shiritoriReadingContinues(reading, chainKey) && shiritoriTailKey(reading) !== null;
}

/**
 * Ranks a non-matching word for use as a distractor. Heads that merely look
 * close to the required kana (same vowel, or same consonant row) are harder to
 * reject at speed than an unrelated kana.
 */
export function shiritoriDistractorScore(reading: string, chainKey: string): number {
  const head = shiritoriHeadKey(reading);
  if (!head || head === chainKey) return 0;
  let score = 1;
  if (VOWEL_BY_KANA[head] && VOWEL_BY_KANA[head] === VOWEL_BY_KANA[chainKey]) score += 3;
  if (shiritoriTailKey(reading) === chainKey) score += 2;
  return score;
}
