"use client";

import { useCallback, useEffect, useState } from "react";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import { glyphTextSizeClass } from "@/app/shared/glyphSizes";
import { REVIEW_RESULTS, SUBJECT_TYPE_DISPLAY, type SubjectType } from "@/lib/domainConstants";
import { srsStageTone } from "@/lib/srs/srsStageTone";

import StudyReviewFlashActionRow from "../study-explorer/components/StudyReviewFlashActionRow";

import { UK_STUDY_BATCH, UK_STUDY_COPY as copy } from "./UkStudy.constants";

type Item = {
  subjectId: number;
  key: string;
  kind: string;
  characters: string;
  level: number;
  meanings: string[];
  readings: string[];
  srsStage: number | null;
};

type Queue = {
  counts: { lessons: number; reviews: number; upcoming: number };
  level: number;
  progress: { passed: number; total: number; gate: string };
  lessons: Item[];
  reviews: Item[];
};

const BUTTON = "inline-flex h-10 items-center rounded-full px-5 text-sm font-black transition disabled:opacity-40";
const PRIMARY = `${BUTTON} bg-accent text-white hover:brightness-110`;
const QUIET = `${BUTTON} border border-line bg-surface text-foreground hover:bg-surface-muted`;

/**
 * A sitting: a batch of items, one at a time, answer revealed on request.
 *
 * Self-graded deliberately, and it says so on screen rather than implying a
 * marker that is not there. A typed grader has to handle every accepted
 * meaning, every reading a word takes and the near-misses in between, and
 * getting that wrong teaches a member the wrong thing — worse than asking them
 * to be honest with themselves for now.
 *
 * Lessons and reviews are the same motion but not the same write: a lesson
 * opens the item, a review moves its stage. So a lesson batch is started in
 * one call and then falls through into reviewing what was just opened.
 */
export default function UkStudySession({ accountId }: { accountId: string }) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [failed, setFailed] = useState(false);
  const [batch, setBatch] = useState<Item[] | null>(null);
  const [at, setAt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* The row draws a running count on each button, the way it does in the
     Study explorer, so a sitting reads the same there and here. */
  const [tally, setTally] = useState({ wrong: 0, skipped: 0, correct: 0 });

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/uk-study/${accountId}/queue?limit=${UK_STUDY_BATCH}`);
      if (!response.ok) throw new Error("failed");
      setQueue((await response.json()) as Queue);
    } catch {
      setFailed(true);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function beginLessons() {
    if (!queue || queue.lessons.length === 0) return;
    setBusy(true);
    try {
      await fetch(`/api/uk-study/${accountId}/lesson/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subjectIds: queue.lessons.map((item) => item.subjectId) }),
      });
      /* Opened items become reviewable immediately for this sitting, so the
         member meets what they have just been taught rather than waiting four
         hours to see it once. */
      setBatch(queue.lessons);
      setAt(0);
      setRevealed(false);
      setNote(null);
      setTally({ wrong: 0, skipped: 0, correct: 0 });
    } finally {
      setBusy(false);
    }
  }

  function beginReviews() {
    if (!queue || queue.reviews.length === 0) return;
    setBatch(queue.reviews);
    setAt(0);
    setRevealed(false);
    setNote(null);
    setTally({ wrong: 0, skipped: 0, correct: 0 });
  }

  function advance() {
    setRevealed(false);
    if (batch && at + 1 >= batch.length) {
      setBatch(null);
      void load();
    } else {
      setAt((current) => current + 1);
    }
  }

  /** Passes without writing, so the item keeps its stage and comes back. */
  function skip() {
    setTally((current) => ({ ...current, skipped: current.skipped + 1 }));
    advance();
  }

  async function answer(result: "correct" | "wrong") {
    const item = batch?.[at];
    if (!item) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/uk-study/${accountId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subjectId: item.subjectId, result }),
      });
      if (response.ok) {
        const outcome = (await response.json()) as { level: number; levelledUp: boolean };
        if (outcome.levelledUp) setNote(copy.levelledUp(outcome.level));
      }
    } finally {
      setBusy(false);
      setTally((current) =>
        result === REVIEW_RESULTS.correct
          ? { ...current, correct: current.correct + 1 }
          : { ...current, wrong: current.wrong + 1 },
      );
      advance();
    }
  }

  if (failed) return <p className="text-sm font-semibold text-rose-600">{copy.failed}</p>;
  if (!queue) return <p className="text-sm font-semibold text-foreground/60">{copy.loading}</p>;

  const item = batch?.[at] ?? null;
  const left = batch ? batch.length - at - 1 : 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <p className="text-2xl font-black tabular-nums text-foreground">
          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.level} </span>
          UK{queue.level}
        </p>
        {queue.progress.total > 0 ? (
          <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
            {copy.progress(queue.progress.passed, queue.progress.total, gateLabel(queue.progress.gate))}
          </p>
        ) : null}
        <span className="ml-auto flex gap-2">
          <Count label={copy.lessons} value={queue.counts.lessons} />
          <Count label={copy.reviews} value={queue.counts.reviews} />
          <Count label={copy.upcoming} value={queue.counts.upcoming} />
        </span>
      </div>

      {note ? <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-800">{note}</p> : null}

      {item ? (
        <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_TYPE_DISPLAY[item.kind as SubjectType]?.singular ?? item.kind} · UK{item.level}
            {item.srsStage !== null ? (
              <span className={`ml-2 rounded-full px-2 py-0.5 ${srsStageTone(item.srsStage)}`}>SRS {item.srsStage}</span>
            ) : null}
          </p>
          <p {...japaneseTextProps(`${glyphTextSizeClass(item.characters)} font-black text-foreground`)}>
            {item.characters}
          </p>

          {revealed ? (
            <div className="mt-5 space-y-1">
              {item.readings.length > 0 ? (
                <p {...japaneseTextProps("text-lg font-black text-foreground")}>{item.readings.join("、")}</p>
              ) : null}
              <p className="text-sm font-bold text-foreground/80">{displayMeanings(item.meanings)}</p>
            </div>
          ) : null}

          <div className="mx-auto mt-6 max-w-lg">
            {revealed ? (
              /* The site's own answer row: Wrong / Skip / Correct, its keyboard
                 shortcuts and its running tallies. Two hand-rolled buttons here
                 would have been a third way to answer a question on a site that
                 already has two. */
              <StudyReviewFlashActionRow
                isPracticeItem={false}
                assignmentId={item.subjectId}
                wrong={tally.wrong}
                skipped={tally.skipped}
                correct={tally.correct}
                isSubmittingSelected={busy}
                onSubmit={(_id, result) => answer(result)}
                onSkipCurrent={skip}
              />
            ) : (
              <button type="button" className={PRIMARY} onClick={() => setRevealed(true)}>
                {copy.reveal}
              </button>
            )}
          </div>

          <p className="mt-4 text-[11px] font-semibold text-foreground/60">{copy.remaining(left)}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <button type="button" disabled={busy || queue.counts.lessons === 0} className={PRIMARY} onClick={beginLessons}>
            {copy.startLessons}
          </button>
          <button type="button" disabled={queue.counts.reviews === 0} className={QUIET} onClick={beginReviews}>
            {copy.doReviews}
          </button>
          {queue.counts.lessons === 0 && queue.counts.reviews === 0 ? (
            <p className="w-full text-sm font-semibold text-foreground/70">{copy.nothingDue}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}

/**
 * The senses worth showing, without the dictionary's own bookkeeping.
 *
 * RADKFILE glosses a radical as "divining, fortune-telling, divination or
 * katakana to radical (no. 25)" — the last clause is the index talking about
 * itself, not something to learn. Three senses is what a member can hold.
 */
function displayMeanings(meanings: string[]): string {
  const senses = meanings
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.replace(/\(no\.\s*\d+\)/gi, "").trim())
    .filter((entry) => entry.length > 0 && !/^(or )?katakana .* radical$/i.test(entry));
  return senses.slice(0, 3).join(", ") || "—";
}

/** "radicals" / "kanji", in the words a member reads elsewhere on the site. */
function gateLabel(gate: string): string {
  return (SUBJECT_TYPE_DISPLAY[gate as SubjectType]?.plural ?? gate).toLowerCase();
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-xl border border-line bg-surface-muted px-3 py-1.5 text-center">
      <span className="block text-sm font-black tabular-nums text-foreground">{value}</span>
      <span className="block text-[9px] font-black uppercase tracking-[0.06em] text-foreground/60">{label}</span>
    </span>
  );
}
