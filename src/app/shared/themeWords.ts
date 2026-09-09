/**
 * Which language a theme's rung names are read in.
 *
 * The ladder drew the Japanese word large with the romaji small underneath,
 * which is the right way round for a member who can read it and the wrong way
 * round for everybody else: 門下生 over `Monkasei` asks a beginner to learn a
 * word for the stage before they can use the word for the stage. Romaji leads
 * now, and the Japanese is one press away.
 *
 * Two states, not four. `pillWords` has four because a chip has two
 * independent halves and a member may want either, both or neither; a rung has
 * one name in two scripts, so the only question is which script leads.
 *
 * Pure and deliberately not a hook, for the same reason `pillWords` is: the
 * selector runs in a server render as well as a client one, and testing the
 * choice should not need a DOM.
 */
export const THEME_WORD_MODES = {
  romaji: "romaji",
  japanese: "japanese",
} as const;

export type ThemeWordMode = (typeof THEME_WORD_MODES)[keyof typeof THEME_WORD_MODES];

export const THEME_WORD_MODE_VALUES = Object.values(THEME_WORD_MODES);

/** Where the choice is remembered, per browser. */
export const THEME_WORDS_STORAGE_KEY = "umakuma:theme-words";

/**
 * Romaji to begin with.
 *
 * A member meets their theme before they can read it - the picker is on the
 * settings page, which is one of the first places anybody goes - so the
 * default has to be the one that is legible on arrival.
 */
export const DEFAULT_THEME_WORD_MODE: ThemeWordMode = THEME_WORD_MODES.romaji;

export function isThemeWordMode(value: string): value is ThemeWordMode {
  return (THEME_WORD_MODE_VALUES as string[]).includes(value);
}

/**
 * Whether the Japanese word is the one that leads.
 *
 * The single shared fact. What sits on the second line is the surface's own
 * question and is answered there: the ladder has no room for a stage column so
 * it anchors the Japanese with `APPR - SRS 1`, while the stages table already
 * carries the stage and the WaniKani word in columns of their own and would
 * only be repeating itself.
 */
export function themeLeadIsJapanese(mode: ThemeWordMode): boolean {
  return mode === THEME_WORD_MODES.japanese;
}
