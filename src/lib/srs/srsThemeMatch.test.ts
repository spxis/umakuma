import { describe, expect, it } from "vitest";

import { AGE_BANDS } from "./ageBand";
import {
  answeredThemeQuiz,
  activeAvoidTags,
  forcedAvoidTags,
  rankingTags,
  themeQuizPick,
  themeQuizPool,
  themeQuizSuggestions,
} from "./srsThemeMatch";
import { DEFAULT_SRS_THEME_ID, SRS_THEME_RATINGS, srsThemes } from "./srsThemes";
import {
  ALL_SRS_THEME_TAGS,
  AVOID_TAGS,
  DRAW_TAGS,
  FORCED_AVOID_TAGS,
  NO_THEME_QUIZ_ANSWERS,
  SCRIPT_TAGS,
  SETTING_TAGS,
  STYLE_TAGS,
  type AvoidTag,
  type ThemeQuizAnswers,
} from "./srsThemeTags";

/**
 * The questionnaire is a way into ninety themes, so what has to hold is that
 * it narrows without hiding, that skipping it is a path rather than an error,
 * and that no combination of five answers can put an adult theme in front of
 * an account that has not said it is eighteen.
 */
describe("the theme questionnaire", () => {
  const themes = srsThemes();
  const answers = (partial: Partial<ThemeQuizAnswers>): ThemeQuizAnswers => ({
    ...NO_THEME_QUIZ_ANSWERS,
    ...partial,
  });

  /* Every question must have something behind it. An option nobody can reach
     a theme through is a dead chip, and it looks identical to a live one. */
  it("gives every answer at least a few themes to reach", () => {
    for (const tag of [...DRAW_TAGS, ...SETTING_TAGS, ...STYLE_TAGS, ...SCRIPT_TAGS]) {
      const carrying = themes.filter((theme) => theme.tags.includes(tag));
      expect(carrying.length, `nothing is tagged "${tag}"`).toBeGreaterThanOrEqual(3);
    }
  });

  it("tags every theme out of the shared vocabulary, and nothing else", () => {
    const vocabulary = new Set<string>(ALL_SRS_THEME_TAGS);
    for (const theme of themes) {
      for (const tag of theme.tags) {
        expect(vocabulary.has(tag), `${theme.id} carries an unknown tag "${tag}"`).toBe(true);
      }
      /* Exactly one script tag, always, because it is computed rather than
         written: a theme with none or two would mean the build is broken. */
      const scripts = theme.tags.filter((tag) => (SCRIPT_TAGS as readonly string[]).includes(tag));
      expect(scripts, theme.id).toHaveLength(1);
    }
  });

  /*
   * Skipping is a first-class path. No answers is not an empty screen and not
   * an error: it is the default theme, and a member is never held up by a quiz.
   */
  it("gives the default theme when every question is skipped", () => {
    expect(answeredThemeQuiz(NO_THEME_QUIZ_ANSWERS)).toBe(false);
    expect(rankingTags(NO_THEME_QUIZ_ANSWERS)).toEqual([]);
    expect(themeQuizSuggestions(themes, NO_THEME_QUIZ_ANSWERS, null)).toEqual([]);

    for (const band of [null, undefined, ...Object.values(AGE_BANDS)]) {
      expect(themeQuizPick(themes, NO_THEME_QUIZ_ANSWERS, band).id).toBe(DEFAULT_SRS_THEME_ID);
    }
  });

  /* Ticking only the avoid chips narrows nothing, so it must not be mistaken
     for an answer and produce a "nothing matched" panel. */
  it("does not treat the avoid question as something that can rank a theme", () => {
    const onlyAvoid = answers({ avoid: ["violence"] });
    expect(answeredThemeQuiz(onlyAvoid)).toBe(false);
    expect(themeQuizPick(themes, onlyAvoid, AGE_BANDS.adult).id).toBe(DEFAULT_SRS_THEME_ID);
  });

  it("ranks by how many answers a theme carries, best first", () => {
    const matches = themeQuizSuggestions(
      themes,
      answers({ draw: "anime", setting: "dojo", style: "discipline" }),
      AGE_BANDS.adult,
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].score).toBe(3);
    for (const [index, match] of matches.entries()) {
      expect(match.matched).toHaveLength(match.score);
      if (index > 0) expect(match.score).toBeLessThanOrEqual(matches[index - 1].score);
      for (const tag of match.matched) expect(match.theme.tags).toContain(tag);
    }
  });

  it("keeps the suggestions to a handful", () => {
    const wide = themeQuizSuggestions(themes, answers({ style: "turning-up" }), AGE_BANDS.adult);
    expect(themes.filter((theme) => theme.tags.includes("turning-up")).length).toBeGreaterThan(6);
    expect(wide.length).toBeLessThanOrEqual(6);
  });

  it("drops a theme a member has put off the table", () => {
    const kept = themeQuizSuggestions(themes, answers({ style: "power" }), AGE_BANDS.adult, 200);
    expect(kept.some((match) => match.theme.tags.includes("violence"))).toBe(true);

    const dropped = themeQuizSuggestions(
      themes,
      answers({ style: "power", avoid: ["violence"] }),
      AGE_BANDS.adult,
      200,
    );
    expect(dropped.some((match) => match.theme.tags.includes("violence"))).toBe(false);
    expect(dropped.length).toBeGreaterThan(0);
  });

  /*
   * Violence is a preference and must stay one. A fifteen-year-old is allowed
   * the corps ranks and the demon corps; forcing that filter on their band
   * would take away exactly the themes the band exists to permit.
   */
  it("forces only the underworld off the table, and only under 18", () => {
    expect(forcedAvoidTags(AGE_BANDS.adult)).toEqual([]);
    for (const band of [null, undefined, AGE_BANDS.under13, AGE_BANDS.teen]) {
      expect(forcedAvoidTags(band)).toEqual([...FORCED_AVOID_TAGS]);
      expect(forcedAvoidTags(band)).not.toContain("violence");
    }
    expect(activeAvoidTags(answers({ avoid: ["violence"] }), AGE_BANDS.teen).sort()).toEqual(
      ["adult-content", "underworld", "violence"].sort(),
    );
  });

  it("still offers a teenager the themes their band is for", () => {
    const forTeens = themeQuizPool(themes, AGE_BANDS.teen);
    expect(forTeens.some((theme) => theme.rating === SRS_THEME_RATINGS.teen)).toBe(true);
    expect(forTeens.some((theme) => theme.tags.includes("violence"))).toBe(true);
  });

  /*
   * The one that matters. Every combination of the five questions, against
   * every band that is not `18_plus` — a null band included, because an
   * account that has never said is treated as the youngest.
   */
  it("never offers an under-18 account an adult theme, by any combination of answers", () => {
    const avoidSets: AvoidTag[][] = [[]];
    for (const tag of AVOID_TAGS) for (const set of [...avoidSets]) avoidSets.push([...set, tag]);

    const bands = [null, undefined, AGE_BANDS.under13, AGE_BANDS.teen];
    /* Collected rather than asserted inside the loop: an `expect` per theme
       per combination is tens of thousands of assertions and minutes of clock,
       and one list of what leaked reads better than the first failure anyway. */
    const leaked = new Set<string>();
    let checked = 0;

    for (const band of bands) {
      for (const draw of [null, ...DRAW_TAGS]) {
        for (const setting of [null, ...SETTING_TAGS]) {
          for (const style of [null, ...STYLE_TAGS]) {
            for (const script of [null, ...SCRIPT_TAGS]) {
              for (const avoid of avoidSets) {
                const asked = answers({ draw, setting, style, script, avoid });
                const offered = [
                  ...themeQuizSuggestions(themes, asked, band, themes.length).map((match) => match.theme),
                  themeQuizPick(themes, asked, band),
                ];
                for (const theme of offered) {
                  const banned =
                    theme.rating === SRS_THEME_RATINGS.adult ||
                    theme.tags.some((tag) => (FORCED_AVOID_TAGS as readonly string[]).includes(tag));
                  if (banned) leaked.add(`${theme.id} reached ${String(band)}`);
                }
                checked += 1;
              }
            }
          }
        }
      }
    }

    expect([...leaked]).toEqual([]);
    /* 4 bands x 7 draws x 7 settings x 6 styles x 4 scripts x 8 avoid sets. */
    expect(checked).toBe(4 * 7 * 7 * 6 * 4 * 8);
  });

  /*
   * Reachable *through* the questions, not merely present in the list: a theme
   * carrying no ranking tag can only ever be found by scrolling, which is the
   * problem the questionnaire exists to solve.
   */
  it("gives every theme at least one answer that can surface it", () => {
    const ranking = new Set<string>([...DRAW_TAGS, ...SETTING_TAGS, ...STYLE_TAGS]);
    const stranded = themes.filter((theme) => !theme.tags.some((tag) => ranking.has(tag)));
    expect(stranded.map((theme) => theme.id)).toEqual([]);

    /* And each one actually comes back for one of its own tags. */
    for (const theme of themes) {
      const tag = theme.tags.find((entry) => ranking.has(entry));
      const style = (STYLE_TAGS as readonly string[]).includes(tag ?? "");
      const asked = answers(
        style
          ? { style: tag as (typeof STYLE_TAGS)[number] }
          : (DRAW_TAGS as readonly string[]).includes(tag ?? "")
            ? { draw: tag as (typeof DRAW_TAGS)[number] }
            : { setting: tag as (typeof SETTING_TAGS)[number] },
      );
      const found = themeQuizSuggestions(themes, asked, AGE_BANDS.adult, themes.length);
      expect(found.map((match) => match.theme.id), theme.id).toContain(theme.id);
    }
  });

  /*
   * The questionnaire narrows; it never hides. A theme with nothing to say
   * about any of the five questions is still in the list a member browses.
   */
  it("leaves every theme an account may see reachable by browsing", () => {
    const browsable = themeQuizPool(themes, AGE_BANDS.adult);
    expect(browsable).toHaveLength(themes.length);
    for (const theme of themes) {
      expect(browsable.map((entry) => entry.id)).toContain(theme.id);
    }
  });
});
