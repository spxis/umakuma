"use client";

import { useState } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { glyphTextSizeClass } from "@/app/shared/glyphSizes";
import type { PlacementProbePayload } from "@/lib/uk/placementTypes";

import { probeHeading, probeProgress, WELCOME_COPY } from "./welcomeCopy";

type Props = {
  probe: PlacementProbePayload;
  busy: boolean;
  error: string | null;
  onSubmit: (chosenSubjectIds: number[]) => void;
  onStop: () => void;
};

const PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:opacity-60";
const QUIET =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-foreground/70 transition hover:bg-surface-muted";

/**
 * One round of the placement test.
 *
 * Every question on screen at once rather than one at a time, because the
 * staircase scores the round rather than the answer: showing them one by one
 * would suggest each is being judged, and would stop a member going back to
 * the third one when the sixth reminds them of it.
 *
 * Nothing is marked right or wrong here, during or after. The page is never
 * told which tile was correct - that is what lets the test be run from a
 * signed ticket instead of a table - and a test that showed its answers would
 * teach the next round.
 *
 * The parent gives this a `key` of the probe's ticket, so a new round arrives
 * as a new component with empty answers rather than as an effect clearing the
 * old ones.
 */
export default function PlacementProbeCard({ probe, busy, error, onSubmit, onStop }: Props) {
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [unanswered, setUnanswered] = useState(false);

  const answers = probe.questions.map((question) => chosen[question.position]);
  const complete = answers.every((answer) => typeof answer === "number");

  function submit() {
    if (!complete) {
      setUnanswered(true);
      return;
    }
    onSubmit(answers as number[]);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {probeProgress(probe.probeNumber, probe.maxProbes)}
        </p>
        <h2 className="text-lg font-black text-foreground">{probeHeading(probe.rung)}</h2>
        <p className="mt-1 text-sm text-foreground/70">{WELCOME_COPY.probeBody}</p>
      </div>

      <ol className="space-y-3">
        {probe.questions.map((question) => (
          <li
            key={question.position}
            className="rounded-xl border border-line bg-surface-muted/40 p-3 sm:flex sm:items-center sm:gap-4"
          >
            <p
              id={`placementPrompt${question.position}`}
              lang="ja"
              translate="no"
              className={`text-center font-black leading-none sm:w-28 ${JP_TEXT_CLASS} ${glyphTextSizeClass(question.prompt)}`}
            >
              {question.prompt}
            </p>
            {/* Named by the glyph it belongs to, so a screen reader reaching
                the fourth set of choices knows which character they answer. */}
            <div
              role="group"
              aria-labelledby={`placementPrompt${question.position}`}
              className="mt-3 grid gap-2 sm:mt-0 sm:flex-1 sm:grid-cols-2"
            >
              {question.options.map((option) => {
                const picked = chosen[question.position] === option.subjectId;
                return (
                  <button
                    key={option.subjectId}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => {
                      setUnanswered(false);
                      setChosen((current) => ({ ...current, [question.position]: option.subjectId }));
                    }}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                      picked ? "border-accent bg-accent/10 text-foreground" : "border-line bg-surface text-foreground/80 hover:bg-surface-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {unanswered ? <p className="text-sm font-bold text-foreground/70">{WELCOME_COPY.probeUnanswered}</p> : null}
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={submit} className={PRIMARY}>
          {busy ? WELCOME_COPY.probeSubmitting : WELCOME_COPY.probeSubmit}
        </button>
        <button type="button" disabled={busy} onClick={onStop} className={QUIET}>
          {WELCOME_COPY.probeStop}
        </button>
      </div>
    </div>
  );
}
