/**
 * The vocabulary a theme is described in, and the five questions that ask for it.
 *
 * Ninety themes is a list nobody reads to the end. The questions are not a
 * quiz with a right answer — each one sets *tags*, the tags are compared with
 * the ones on every theme, and the best few are offered. Nothing is taken off
 * the browsing list by answering; a member who wants to scroll all ninety
 * still can.
 *
 * **The tags themselves live in the generated data.** `srsThemes.json` carries
 * a `tags` array per theme, written by hand in `scripts/srs-theme-tags.mjs`
 * beside the ratings and the renames and emitted by `pnpm themes:build`. This
 * file only says what a tag may be, so a typo in the map fails the build and a
 * tag dropped from the vocabulary fails a test rather than quietly matching
 * nothing.
 *
 * This module deliberately imports nothing: `srsThemes.ts` takes its tag type
 * from here, so anything imported here would close a cycle.
 */

/** Why a member came to Japanese at all. */
export const DRAW_TAGS = ["anime", "games", "travel", "work", "language", "family"] as const;

/** Where they would rather spend an afternoon. */
export const SETTING_TAGS = ["dojo", "city-night", "spaceship", "mountain-temple", "office", "stadium"] as const;

/** How they like to win. */
export const STYLE_TAGS = ["discipline", "cleverness", "power", "kindness", "turning-up"] as const;

/** How much of the ladder is written in kanji and kana rather than katakana. */
export const SCRIPT_TAGS = ["all-japanese", "mixed-script", "english-friendly"] as const;

/** What a member can put off the table — and what an age band puts off it for them. */
export const AVOID_TAGS = ["violence", "underworld", "adult-content"] as const;

export type DrawTag = (typeof DRAW_TAGS)[number];
export type SettingTag = (typeof SETTING_TAGS)[number];
export type StyleTag = (typeof STYLE_TAGS)[number];
export type ScriptTag = (typeof SCRIPT_TAGS)[number];
export type AvoidTag = (typeof AVOID_TAGS)[number];

export type SrsThemeTag = DrawTag | SettingTag | StyleTag | ScriptTag | AvoidTag;

/**
 * The four that rank a theme.
 *
 * Kept apart from `AvoidTag` in the type, not only in the code: a tag that can
 * take a theme out of the list must never also be able to score one into it,
 * and the compiler is a better place to hold that line than a comment.
 */
export type RankingTag = DrawTag | SettingTag | StyleTag | ScriptTag;

export const ALL_SRS_THEME_TAGS: readonly SrsThemeTag[] = [
  ...DRAW_TAGS,
  ...SETTING_TAGS,
  ...STYLE_TAGS,
  ...SCRIPT_TAGS,
  ...AVOID_TAGS,
];

/** Which question a member is on. The order they are asked in. */
export const THEME_QUIZ_QUESTIONS = ["draw", "setting", "style", "script", "avoid"] as const;

export type ThemeQuizQuestion = (typeof THEME_QUIZ_QUESTIONS)[number];

/** The options each question offers, in the order they are drawn. */
export const THEME_QUIZ_OPTIONS = {
  draw: DRAW_TAGS,
  setting: SETTING_TAGS,
  style: STYLE_TAGS,
  script: SCRIPT_TAGS,
  avoid: AVOID_TAGS,
} as const satisfies Record<ThemeQuizQuestion, readonly SrsThemeTag[]>;

/**
 * What a member has said so far. Every answer may be nothing.
 *
 * The first four are one-of; the last is a set, because putting two things off
 * the table is an ordinary thing to want.
 */
export type ThemeQuizAnswers = {
  draw: DrawTag | null;
  setting: SettingTag | null;
  style: StyleTag | null;
  script: ScriptTag | null;
  avoid: AvoidTag[];
};

/** Nobody has answered anything. The state a member starts and skips in. */
export const NO_THEME_QUIZ_ANSWERS: ThemeQuizAnswers = {
  draw: null,
  setting: null,
  style: null,
  script: null,
  avoid: [],
};

/**
 * The two an age band forces off the table.
 *
 * `violence` is not one of them and must not become one: a fifteen-year-old is
 * allowed the corps ranks and the demon corps, and forcing that filter on them
 * would take away exactly the themes their band exists to permit. Organised
 * crime, nightlife and the sex trade are the ones an account has to be
 * eighteen to be offered.
 */
export const FORCED_AVOID_TAGS: readonly AvoidTag[] = ["underworld", "adult-content"];

export function isSrsThemeTag(value: unknown): value is SrsThemeTag {
  return typeof value === "string" && (ALL_SRS_THEME_TAGS as readonly string[]).includes(value);
}
