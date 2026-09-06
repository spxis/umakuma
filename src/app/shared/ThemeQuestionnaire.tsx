"use client";

import { useMemo, useState } from "react";

import { japaneseTextProps } from "./japaneseText";
import type { AgeBand } from "@/lib/srs/ageBand";
import { answeredThemeQuiz, forcedAvoidTags, themeQuizSuggestions } from "@/lib/srs/srsThemeMatch";
import { srsThemeBuckets, type SrsTheme } from "@/lib/srs/srsThemes";
import {
  NO_THEME_QUIZ_ANSWERS,
  THEME_QUIZ_OPTIONS,
  type AvoidTag,
  type SrsThemeTag,
  type ThemeQuizAnswers,
  type ThemeQuizQuestion,
} from "@/lib/srs/srsThemeTags";

import { THEME_CHIP, THEME_QUIZ_COPY as copy } from "./themeCopy";

/**
 * Five questions instead of scrolling ninety cards.
 *
 * Each answer sets a tag rather than choosing a theme, the tags are compared
 * with the ones every theme carries, and the best few come up as cards. The
 * full list is still underneath — this narrows, it never hides — and every
 * question can be left alone, because a member who wants to get on with
 * learning Japanese should not have to finish a quiz first.
 *
 * The last question is not a preference. Organised crime, nightlife and the
 * sex trade come off the table for any account not set to 18 or over, and those
 * chips are drawn on and locked rather than hidden, so a member can see what
 * the account is doing on their behalf.
 *
 * Nothing here is stored. The answers live for as long as the page does; what
 * gets saved is the theme a member picks out of the suggestions, through the
 * same call the browsing list below uses.
 */
export default function ThemeQuestionnaire({
  themes,
  ageBand,
  currentThemeId,
  busy,
  onPick,
}: {
  themes: SrsTheme[];
  ageBand: AgeBand | null;
  currentThemeId: string;
  busy: boolean;
  onPick: (themeId: string) => void;
}) {
  const [answers, setAnswers] = useState<ThemeQuizAnswers>(NO_THEME_QUIZ_ANSWERS);

  /* Derived, never mirrored into state: the answers are the only thing held,
     and the suggestions are a pure function of them. */
  const forced = useMemo(() => forcedAvoidTags(ageBand), [ageBand]);
  const suggestions = useMemo(
    () => themeQuizSuggestions(themes, answers, ageBand),
    [themes, answers, ageBand],
  );
  /* Two different questions. `answered` is whether anything can rank a theme;
     the avoid chips alone narrow nothing, so they must not turn an untouched
     panel into "nothing matched". `touched` is whether there is anything to
     put back. */
  const answered = answeredThemeQuiz(answers);
  const touched = answered || answers.avoid.length > 0;

  function toggleAvoid(tag: AvoidTag) {
    setAnswers((prev) => ({
      ...prev,
      avoid: prev.avoid.includes(tag) ? prev.avoid.filter((entry) => entry !== tag) : [...prev.avoid, tag],
    }));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface-muted/40 p-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.heading}</p>
        <p className="mt-0.5 text-[13px] font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
      </div>

      <QuestionRow
        question="draw"
        options={THEME_QUIZ_OPTIONS.draw}
        chosen={answers.draw}
        busy={busy}
        onChoose={(tag) => setAnswers((prev) => ({ ...prev, draw: prev.draw === tag ? null : tag }))}
      />
      <QuestionRow
        question="setting"
        options={THEME_QUIZ_OPTIONS.setting}
        chosen={answers.setting}
        busy={busy}
        onChoose={(tag) => setAnswers((prev) => ({ ...prev, setting: prev.setting === tag ? null : tag }))}
      />
      <QuestionRow
        question="style"
        options={THEME_QUIZ_OPTIONS.style}
        chosen={answers.style}
        busy={busy}
        onChoose={(tag) => setAnswers((prev) => ({ ...prev, style: prev.style === tag ? null : tag }))}
      />
      <QuestionRow
        question="script"
        options={THEME_QUIZ_OPTIONS.script}
        chosen={answers.script}
        busy={busy}
        onChoose={(tag) => setAnswers((prev) => ({ ...prev, script: prev.script === tag ? null : tag }))}
      />

      <div>
        <p className="text-[12px] font-black text-foreground">{copy.questions.avoid}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {THEME_QUIZ_OPTIONS.avoid.map((tag) => {
            const locked = forced.includes(tag);
            const on = locked || answers.avoid.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                disabled={busy || locked}
                aria-pressed={on}
                title={locked ? copy.forcedBlurb : undefined}
                onClick={() => toggleAvoid(tag)}
                className={`${THEME_CHIP.base} ${on ? THEME_CHIP.active : THEME_CHIP.idle} ${
                  locked ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                {copy.tags[tag]}
              </button>
            );
          })}
        </div>
        {forced.length > 0 ? (
          <p className="mt-1.5 text-[11px] font-semibold text-foreground/60">
            <span className="font-black">{copy.forced}.</span> {copy.forcedBlurb}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.suggestions}</p>
        {touched ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAnswers(NO_THEME_QUIZ_ANSWERS)}
            className="text-[11px] font-black text-accent hover:underline"
          >
            {copy.clear}
          </button>
        ) : null}
      </div>

      <Suggestions
        answered={answered}
        busy={busy}
        currentThemeId={currentThemeId}
        onPick={onPick}
        suggestions={suggestions.map((match) => ({
          theme: match.theme,
          because: copy.because(match.matched.map((tag) => copy.tags[tag].toLowerCase())),
        }))}
      />
    </div>
  );
}

/** One question: its words, and a chip per tag it can set. */
function QuestionRow<T extends SrsThemeTag>({
  question,
  options,
  chosen,
  busy,
  onChoose,
}: {
  question: ThemeQuizQuestion;
  options: readonly T[];
  chosen: T | null;
  busy: boolean;
  onChoose: (tag: T) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-black text-foreground">{copy.questions[question]}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={busy}
            aria-pressed={chosen === tag}
            onClick={() => onChoose(tag)}
            className={`${THEME_CHIP.base} ${chosen === tag ? THEME_CHIP.active : THEME_CHIP.idle}`}
          >
            {copy.tags[tag]}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The handful the answers came to.
 *
 * Three states, kept apart on purpose: nothing asked yet, asked and nothing
 * fits, and here they are. "Nothing fits" and "not asked yet" look identical
 * as an empty grid and mean opposite things.
 */
function Suggestions({
  answered,
  busy,
  currentThemeId,
  onPick,
  suggestions,
}: {
  answered: boolean;
  busy: boolean;
  currentThemeId: string;
  onPick: (themeId: string) => void;
  suggestions: { theme: SrsTheme; because: string }[];
}) {
  if (!answered) return <p className="text-[12px] font-semibold text-foreground/60">{copy.unanswered}</p>;
  if (suggestions.length === 0) {
    return <p className="text-[12px] font-semibold text-foreground/60">{copy.noMatches}</p>;
  }

  return (
    <>
      <p className="-mt-2 text-[12px] font-semibold text-foreground/60">{copy.suggestionsBlurb}</p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {suggestions.map(({ theme, because }) => {
          const chosen = theme.id === currentThemeId;
          return (
            <li key={theme.id}>
              <button
                type="button"
                disabled={busy}
                aria-pressed={chosen}
                onClick={() => onPick(theme.id)}
                className={`h-full w-full rounded-2xl border p-3 text-left transition ${
                  chosen ? "border-accent bg-accent/5" : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <span className="block text-sm font-black text-foreground">{theme.name}</span>
                <span {...japaneseTextProps("mt-1 block text-[13px] font-semibold text-foreground/70")}>
                  {srsThemeBuckets(theme)
                    .map((bucket) => bucket.levels[0].short)
                    .join(" → ")}
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-foreground/60">{because}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
