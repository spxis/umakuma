/**
 * Release codenames, Ubuntu-style but on the gojūon.
 *
 * Each release's version minor walks the 44 usable kana in dictionary order —
 * を is skipped because almost nothing starts with it, and ん because nothing
 * does (our own Shiritori game ends chains on it). After わ the cycle rolls
 * over and the kana repeat with fresh word pairs; a pair itself is never
 * reused, and no word appears twice anywhere in the list — every release's
 * pair is built from words no earlier release used.
 *
 * The codename test pins every entry's reading to its computed kana and
 * requires exactly one entry per shipped version, so a new release must add
 * its name or fail `quality:check`.
 */

export const GOJUON_SEQUENCE = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ",
  "ら", "り", "る", "れ", "ろ",
  "わ",
] as const;

export type ReleaseCodename = {
  /** Latin rendering shown in the footer. */
  romaji: string;
  /** The name as written, kanji and kana. */
  ja: string;
  /** Full hiragana reading; its first character must match the release's kana. */
  reading: string;
  /** What the name means, for anyone who cannot read the Japanese. */
  gloss: string;
};

export function codenameKanaForMinor(minor: number): { kana: string; cycle: number } {
  const index = (minor - 1) % GOJUON_SEQUENCE.length;
  return { kana: GOJUON_SEQUENCE[index], cycle: Math.floor((minor - 1) / GOJUON_SEQUENCE.length) + 1 };
}

/** Katakana to hiragana, so a name written in katakana still checks its kana. */
export function toHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

/** Index 0 names v0.1.0; a release's codename is CODENAMES[minor - 1]. */

/**
 * The kanji form worth printing beside the reading, or `null` when the name is
 * already written in kana and showing both would just repeat it.
 */
import { CODENAMES } from "./releaseCodenameList";

export { CODENAMES };

export function codenameKanji(codename: ReleaseCodename): string | null {
  return codename.ja === codename.reading ? null : codename.ja;
}

export function codenameForMinor(minor: number): ReleaseCodename | null {
  return CODENAMES[minor - 1] ?? null;
}

export function codenameForVersion(version: string): ReleaseCodename | null {
  const minor = Number(version.split(".")[1]);
  return Number.isFinite(minor) ? codenameForMinor(minor) : null;
}
