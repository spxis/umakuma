import { ratingFor } from "./ageBand";
import {
  DEFAULT_SRS_THEME_ID,
  SRS_THEME_RATINGS,
  srsTheme,
  srsThemesFor,
  type SrsTheme,
} from "./srsThemes";
import {
  FORCED_AVOID_TAGS,
  type AvoidTag,
  type RankingTag,
  type ThemeQuizAnswers,
} from "./srsThemeTags";

/**
 * Five questions instead of ninety cards.
 *
 * A member picking an SRS theme is choosing what nine stages are called, and
 * there are ninety sets to choose between. Scrolling is not a way to choose;
 * the twentieth card looks like the fifth. So the picker asks five questions
 * — what brought you to Japanese, where you would rather be, how you like to
 * win, how much Japanese you want in the words, and what you would rather not
 * see — and each answer sets a tag rather than choosing a theme.
 *
 * **Narrowing, not hiding.** Answers rank a handful to the top. The full list
 * an account may see is still underneath, in the same order it always was, and
 * a theme carrying no tags at all is still in it. The questionnaire is a way
 * in, never a gate.
 *
 * **Skipping is a first-class path.** No answers is not an error state and not
 * an empty screen: it means the default theme, and a member is never held up
 * by a quiz on the way in.
 *
 * The last question is different in kind from the other four. It does not rank,
 * it removes — and part of it is not the member's to answer. An account whose
 * age band is anything but `18_plus`, a band it has never given included, has
 * organised crime and the sex trade taken off the table for it. That rule lives
 * in `ratingFor`, and this module leans on it twice: once by only ever scoring
 * themes `srsThemesFor` has already allowed, and again through the forced
 * avoid tags, so a theme mis-rated in the data still cannot reach a child.
 */

/** One theme, and why it came up. */
export type ThemeMatch = {
  theme: SrsTheme;
  /** How many of the four ranking answers this theme carries. 0-4. */
  score: number;
  matched: RankingTag[];
};

/** How many suggestions are worth reading before it is a list again. */
export const THEME_QUIZ_SUGGESTION_LIMIT = 6;

/** The avoid tags an age band settles rather than asking about. */
export function forcedAvoidTags(ageBand: string | null | undefined): AvoidTag[] {
  return ratingFor(ageBand) === SRS_THEME_RATINGS.adult ? [] : [...FORCED_AVOID_TAGS];
}

/** Everything off the table: what the member chose, plus what their band decided. */
export function activeAvoidTags(answers: ThemeQuizAnswers, ageBand: string | null | undefined): AvoidTag[] {
  return [...new Set([...answers.avoid, ...forcedAvoidTags(ageBand)])];
}

/**
 * The four answers that rank, in the order they are asked.
 *
 * The avoid answers are not here on purpose: they take themes away, and a tag
 * that removes a theme must never also be able to score one.
 */
export function rankingTags(answers: ThemeQuizAnswers): RankingTag[] {
  return [answers.draw, answers.setting, answers.style, answers.script].filter(
    (tag): tag is RankingTag => tag !== null,
  );
}

/** Whether anything has been said that could rank a theme. */
export function answeredThemeQuiz(answers: ThemeQuizAnswers): boolean {
  return rankingTags(answers).length > 0;
}

/**
 * The themes an account may be offered at all, with the forced tags removed.
 *
 * This is the browsing list as well as the pool the questionnaire scores over.
 * A member's own avoid answers are not applied here — those narrow the
 * suggestions, and taking a theme out of the list a member is browsing because
 * of an answer they gave two questions ago reads as the list breaking.
 */
export function themeQuizPool(themes: SrsTheme[], ageBand: string | null | undefined): SrsTheme[] {
  const allowed = new Set(srsThemesFor(ratingFor(ageBand)).map((theme) => theme.id));
  const forced = new Set<string>(forcedAvoidTags(ageBand));
  return themes.filter((theme) => allowed.has(theme.id) && !theme.tags.some((tag) => forced.has(tag)));
}

/**
 * The best handful for these answers.
 *
 * Scored by plain tag overlap — one point per answered question the theme
 * carries — because the member can see why a theme came up and a weighting
 * nobody can explain is a weighting nobody can correct. Ties go to the theme
 * with the fewest tags: matching two of three is a tighter fit than matching
 * two of six, and the tight fit is the one worth reading first.
 *
 * Returns nothing at all when nothing has been answered. That is the skip
 * path, and an empty list says so more honestly than the first six themes
 * alphabetically would.
 */
export function themeQuizSuggestions(
  themes: SrsTheme[],
  answers: ThemeQuizAnswers,
  ageBand: string | null | undefined,
  limit: number = THEME_QUIZ_SUGGESTION_LIMIT,
): ThemeMatch[] {
  const wanted = rankingTags(answers);
  if (wanted.length === 0) return [];

  /* The forced tags are already gone from the pool; asking again here is the
     second lock, and it costs a set lookup. */
  const avoided = new Set<string>(activeAvoidTags(answers, ageBand));

  return themeQuizPool(themes, ageBand)
    .filter((theme) => !theme.tags.some((tag) => avoided.has(tag)))
    .map((theme) => {
      const matched = wanted.filter((tag) => theme.tags.includes(tag));
      return { theme, matched, score: matched.length };
    })
    .filter((match) => match.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.theme.tags.length - right.theme.tags.length ||
        left.theme.name.localeCompare(right.theme.name),
    )
    .slice(0, limit);
}

/**
 * The one theme these answers come to.
 *
 * Skipping every question lands on the default rather than on an error or an
 * empty result, and so does a set of answers no theme happens to carry: there
 * is always a theme to hand back, because there is always a theme a member is
 * already on.
 */
export function themeQuizPick(
  themes: SrsTheme[],
  answers: ThemeQuizAnswers,
  ageBand: string | null | undefined,
): SrsTheme {
  return themeQuizSuggestions(themes, answers, ageBand, 1)[0]?.theme ?? srsTheme(DEFAULT_SRS_THEME_ID);
}
