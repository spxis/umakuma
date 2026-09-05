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

/**
 * The name a release was given, by its position in the run.
 *
 * Positional, and it has to be: the 467th release takes the 467th name, and
 * the kana that name starts on is `(release - 1) % 44` along the gojūon. That
 * position used to be read out of the version's minor, because the minor was
 * the count. Under the scheme this site uses now - major for a big release,
 * minor for a feature, patch for a tweak - no field is the count, so the
 * position is recorded on the release itself.
 */
export function codenameForRelease(release: number): ReleaseCodename | null {
  return codenameForMinor(release);
}

/**
 * The name for a version, where the version still says which release it is.
 *
 * True of everything before production, which numbered releases `0.N.0`. A
 * production version returns null, because 1.7.4 does not say it is the 480th
 * release - ask `codenameForRelease` with the number the record holds.
 */
export function codenameForVersion(version: string): ReleaseCodename | null {
  const parts = version.split(".");
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  if (major !== 0 || !Number.isFinite(minor)) return null;
  return codenameForMinor(minor);
}
