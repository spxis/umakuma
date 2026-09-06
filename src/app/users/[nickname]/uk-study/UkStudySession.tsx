"use client";

import { useCallback, useEffect, useState } from "react";


import { SUBJECT_TYPE_DISPLAY, type SubjectType } from "@/lib/domainConstants";
import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { UK_STUDY_COPY as copy } from "./UkStudy.constants";

type WaitingGate = { kind: "checkpoint" | "jlpt_final"; level: number; nLevel?: number } | null;

type ImportOffer = {
  available: boolean;
  wkLevel: number | null;
  floor: number;
  matched: number;
  unmatched: number;
};

type Counts = {
  lessons: number;
  reviews: number;
  upcoming: number;
  throttle?: { held: boolean; due: number };
  currentLevel: number;
  progress: { level: number; passed: number; total: number; gate: string; heldByGate?: string };
};

const BUTTON = "inline-flex h-10 items-center rounded-full px-5 text-sm font-black transition disabled:opacity-40";
const PRIMARY = `${BUTTON} bg-accent text-white hover:brightness-110`;

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
export default function UkStudySession({ accountId, studyHref }: { accountId: string; studyHref: string }) {
  const [queue, setQueue] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<ImportOffer | null>(null);
  const [gate, setGate] = useState<WaitingGate>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/uk-study/${accountId}/counts`);
      if (!response.ok) throw new Error("failed");
      setQueue((await response.json()) as Counts);
    } catch {
      setFailed(true);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    /* Only worth offering while it would actually move them. A member already
       past the floor their WaniKani progress earns is told nothing. */
    fetch(`/api/uk-study/${accountId}/import`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ImportOffer | null) => setOffer(payload))
      .catch(() => setOffer(null));
  }, [accountId]);

  useEffect(() => {
    /* Asked separately from the queue so a slow gate lookup never delays the
       reviews, which are what most visits are for. */
    fetch(`/api/uk-study/${accountId}/level-test`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { gate: WaitingGate } | null) => setGate(payload?.gate ?? null))
      .catch(() => setGate(null));
  }, [accountId, queue?.currentLevel]);

  function sitTest() {
    /* The test is a game the runner starts the way it starts every game, so
       the member is only walked to its lobby; the run is created there, with
       the gate re-derived on the server rather than carried in a link. */
    window.location.assign(window.location.pathname.replace(/\/uk-study\/?$/, "/game/level-test"));
  }

  async function runImport() {
    setBusy(true);
    try {
      const response = await fetch(`/api/uk-study/${accountId}/import`, { method: "POST" });
      if (response.ok) {
        const result = (await response.json()) as { level: number; matched: number };
        setNote(copy.imported(result.level, result.matched));
        setOffer(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (failed) return <p className="text-sm font-semibold text-rose-600">{copy.failed}</p>;
  if (!queue) return <p className="text-sm font-semibold text-foreground/60">{copy.loading}</p>;


  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <p className="text-2xl font-black tabular-nums text-foreground">
          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.level} </span>
          UK{queue.currentLevel}
        </p>
        {queue.progress.total > 0 ? (
          <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
            {copy.progress(queue.progress.passed, queue.progress.total, gateLabel(queue.progress.gate))}
          </p>
        ) : null}
        <span className="ml-auto flex gap-2">
          <Count label={copy.lessons} value={queue.lessons} />
          <Count label={copy.reviews} value={queue.reviews} />
          <Count label={copy.upcoming} value={queue.upcoming} />
        </span>
      </div>

      {note ? <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-800">{note}</p> : null}

      {gate ? (
        <div className="rounded-3xl border border-violet-300 bg-violet-50 p-5">
          <p className="text-sm font-semibold leading-relaxed text-violet-900">
            {gate.kind === "jlpt_final"
              ? copy.testWaiting.jlpt_final(gate.level, gate.nLevel ?? 0)
              : copy.testWaiting.checkpoint(gate.level)}
          </p>
          <button type="button" className={`${PRIMARY} mt-3`} onClick={sitTest}>
            {copy.sitTest}
          </button>
        </div>
      ) : null}

      {offer?.available && offer.wkLevel !== null && offer.floor > queue.currentLevel ? (
        <div className="rounded-3xl border border-accent/40 bg-accent/5 p-5">
          <p className="text-sm font-black text-foreground">{copy.importHeading}</p>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-foreground/80">
            {copy.importOffer(offer.wkLevel, offer.floor, offer.matched)}
          </p>
          {offer.unmatched > 0 ? (
            <p className="mt-1 text-[11px] font-semibold text-foreground/60">{copy.importUnmatched(offer.unmatched)}</p>
          ) : null}
          <button type="button" disabled={busy} className={`${PRIMARY} mt-3`} onClick={runImport}>
            {busy ? copy.importing : copy.importAction}
          </button>
        </div>
      ) : null}

      {/* The sitting itself is the Study explorer's, fed from our ladder: one
          interface for every feed, so a review here looks exactly like a
          review of WaniKani's queue. This page keeps what is ours alone - the
          level, the gate, the import, the numbers. */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <a href={studyHref} className={PRIMARY}>
          {copy.openStudy}
        </a>
        {queue.throttle?.held ? (
          <p className="w-full text-sm font-semibold text-amber-700">{copy.lessonsHeld(queue.throttle.due)}</p>
        ) : queue.lessons === 0 && queue.reviews === 0 ? (
          <p className="w-full text-sm font-semibold text-foreground/70">{copy.nothingDue}</p>
        ) : null}
      </div>

      {/*
        * Which arrangement of the ladder these answers are being recorded
        * against. John: "keep it so that you can barely see it - it's not data
        * that the general public needs to see, so it shouldn't stand out."
        * Faint, small, and last on the page: a stamp on the work rather than a
        * fact about it, there for the moment somebody needs to know why a
        * level moved under them.
        */}
      <p className="text-[10px] font-medium tracking-[0.08em] text-foreground/35" translate="no">
        {copy.curriculumStamp(LADDER_STREAMS.uk, CURRICULUM_VERSION)}
      </p>
    </section>
  );
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
