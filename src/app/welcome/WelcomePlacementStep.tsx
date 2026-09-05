"use client";

import { useEffect, useState } from "react";

import type { PlacementProbePayload, PlacementResultPayload, PlacementStepPayload } from "@/lib/uk/placementTypes";

import PlacementProbeCard from "./PlacementProbeCard";
import { placementResultLine, placementSeedLine, WELCOME_COPY } from "./welcomeCopy";

type Props = {
  accountId: string;
  onDone: () => void;
};

const PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:opacity-60";
const DOOR =
  "w-full rounded-xl border border-line bg-surface p-4 text-left transition hover:bg-surface-muted disabled:opacity-60";

/**
 * Where a member says how much Japanese they already read.
 *
 * Three doors, and the WaniKani one is a link rather than a rebuild: the
 * import already exists, has been carrying stages across item by item since it
 * shipped, and is better evidence than any eight questions. It is only offered
 * when there is something to import, which the import route itself answers -
 * asking it is also how we avoid a fourth door reading "connect WaniKani" to
 * somebody who has just skipped that step on purpose.
 *
 * The test itself is a round at a time. Each round comes back with a signed
 * ticket that carries everything the staircase knows, so this component holds
 * no score of its own and cannot get out of step with the server's idea of
 * where the member is.
 */
export default function WelcomePlacementStep({ accountId, onDone }: Props) {
  const [probe, setProbe] = useState<PlacementProbePayload | null>(null);
  const [result, setResult] = useState<PlacementResultPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Null until asked. False when they have no WaniKani progress to bring. */
  const [hasWanikani, setHasWanikani] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function ask() {
      const response = await fetch(`/api/uk-study/${accountId}/import`).catch(() => null);
      const payload = response?.ok ? await response.json().catch(() => null) : null;
      if (!cancelled) setHasWanikani(payload?.available === true);
    }
    void ask();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  function receive(step: PlacementStepPayload) {
    if (step.done) {
      setProbe(null);
      setResult(step);
      return;
    }
    setResult(null);
    setProbe(step);
  }

  async function post(path: string, body: unknown, fallback: string): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/uk-study/${accountId}/placement/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? fallback);
      setBusy(false);
      return;
    }

    receive((await response.json()) as PlacementStepPayload);
    setBusy(false);
  }

  /* The import raises the floor by itself, so there is nothing to show here
     afterwards: the member goes on to the next question either way. */
  async function bringWanikaniProgress() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/uk-study/${accountId}/import`, { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      setError(WELCOME_COPY.placementImportFailed);
      setBusy(false);
      return;
    }
    onDone();
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-foreground">{WELCOME_COPY.resultHeading}</h2>
          <p className="mt-1 text-sm text-foreground/75">
            {placementResultLine(result.level, result.confidence)}
          </p>
          {result.seeded > 0 ? (
            <p className="mt-1 text-xs text-foreground/60">
              {placementSeedLine(result.seeded, result.seededMissed)}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onDone} className={PRIMARY}>
          {WELCOME_COPY.resultAction}
        </button>
      </div>
    );
  }

  if (probe) {
    return (
      <PlacementProbeCard
        key={probe.ticket}
        probe={probe}
        busy={busy}
        error={error}
        onSubmit={(chosenSubjectIds) =>
          void post("next", { ticket: probe.ticket, chosenSubjectIds }, WELCOME_COPY.placementFailed)
        }
        onStop={() => void post("next", { ticket: probe.ticket, stop: true }, WELCOME_COPY.placementFailed)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-foreground">{WELCOME_COPY.placementHeading}</h2>
        <p className="mt-1 text-sm text-foreground/70">{WELCOME_COPY.placementBody}</p>
      </div>

      <div className="space-y-2">
        <button type="button" disabled={busy} onClick={onDone} className={DOOR}>
          <span className="block text-sm font-black text-foreground">{WELCOME_COPY.placementBeginner}</span>
          <span className="mt-1 block text-xs text-foreground/65">{WELCOME_COPY.placementBeginnerHint}</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void post("start", {}, WELCOME_COPY.placementFailed)}
          className={DOOR}
        >
          <span className="block text-sm font-black text-foreground">
            {busy ? WELCOME_COPY.placementStarting : WELCOME_COPY.placementTest}
          </span>
          <span className="mt-1 block text-xs text-foreground/65">{WELCOME_COPY.placementTestHint}</span>
        </button>

        {hasWanikani ? (
          <button type="button" disabled={busy} onClick={() => void bringWanikaniProgress()} className={DOOR}>
            <span className="block text-sm font-black text-foreground">
              {busy ? WELCOME_COPY.placementImporting : WELCOME_COPY.placementWanikani}
            </span>
            <span className="mt-1 block text-xs text-foreground/65">{WELCOME_COPY.placementWanikaniHint}</span>
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
