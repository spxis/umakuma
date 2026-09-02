"use client";

import { useEffect, useState } from "react";

import { STUDY_TAG_LIST_COPY } from "./studyTagListsUi";

/**
 * The offer to a member with WaniKani: apply its burned items to the Burned
 * list. Counted first so the button says what it will do, applied on the
 * click, repeatable whenever they like, never on sync. Draws nothing for a
 * member WaniKani knows nothing burned for, which includes everyone without
 * a connection.
 */
export default function ApplyWanikaniBurned({ accountId, onApplied }: { accountId: string; onApplied: () => void }) {
  const [candidates, setCandidates] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  /* Counted again after applying, so the offer goes when there is nothing left. */
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/study/${accountId}/tags/burned/wanikani`)
      .then(async (response) => (response.ok ? ((await response.json()) as { candidates?: number }) : null))
      .then((body) => {
        if (!cancelled) setCandidates(body?.candidates ?? 0);
      })
      .catch(() => {
        if (!cancelled) setCandidates(0);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, round]);

  if (candidates === null || candidates === 0) return null;

  async function apply() {
    if (busy) return;
    setBusy(true);
    setDone(null);
    try {
      const response = await fetch(`/api/study/${accountId}/tags/burned/wanikani`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as { applied?: number } | null;
      if (response.ok) {
        setDone(STUDY_TAG_LIST_COPY.applyWanikaniDone(body?.applied ?? 0));
        setRound((value) => value + 1);
        onApplied();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-muted/60 px-3 py-2 sm:px-4">
      <button
        type="button"
        onClick={() => void apply()}
        disabled={busy}
        className="inline-flex h-8 items-center rounded-full bg-accent px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? STUDY_TAG_LIST_COPY.applying : STUDY_TAG_LIST_COPY.applyWanikani(candidates)}
      </button>
      {done ? <span className="text-[11px] font-semibold text-emerald-700">{done}</span> : null}
    </div>
  );
}
