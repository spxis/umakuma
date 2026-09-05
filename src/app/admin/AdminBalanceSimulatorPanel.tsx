"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SimPersona } from "@/lib/xp/simTypes";

import { ADMIN_BALANCE_COPY as copy } from "./AdminBalance.constants";
import AdminBalanceSimulatorControls from "./AdminBalanceSimulatorControls";
import { AdminBalanceImportTable, AdminBalanceSimulatorTable } from "./AdminBalanceSimulatorTable";
import {
  draftFromPersona,
  overridesFromDraft,
  type BalanceRunResponse,
  type PersonaDraft,
} from "./AdminBalanceSimulator.types";
import AdminPanelHeader from "./AdminPanelHeader";
import { useAdminFeedback } from "./AdminFeedbackProvider";

const BUTTON = "inline-flex h-9 items-center rounded-full px-4 text-[12px] font-black transition disabled:opacity-40";

/**
 * The balance model, run from the site.
 *
 * It writes nothing, which is the whole reason it can live on an admin screen
 * next to things that do. Change what a review pays or what a rank costs, run
 * it, and read who moved — the alternative is shipping a change to the economy
 * and finding out from whoever it hurt.
 */
export default function AdminBalanceSimulatorPanel() {
  const { showToast, confirmAction } = useAdminFeedback();
  const [personas, setPersonas] = useState<SimPersona[] | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [days, setDays] = useState("365");
  const [seed, setSeed] = useState("12345");
  const [lessonGate, setLessonGate] = useState("");
  const [throttle, setThrottle] = useState(false);
  const [compareSittings, setCompareSittings] = useState(true);
  const [draft, setDraft] = useState<PersonaDraft | null>(null);
  const [result, setResult] = useState<BalanceRunResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/balance-simulation");
    if (!response.ok) return;
    const payload = (await response.json()) as { personas: SimPersona[] };
    setPersonas(payload.personas);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persona = useMemo(
    () => personas?.find((entry) => entry.id === personaId) ?? null,
    [personas, personaId],
  );

  function choose(id: string | null) {
    setPersonaId(id);
    const found = personas?.find((entry) => entry.id === id) ?? null;
    setDraft(found ? draftFromPersona(found) : null);
  }

  async function reset() {
    if (!persona) return;
    if (!(await confirmAction({ title: copy.reset, description: copy.resetConfirm, confirmLabel: copy.reset }))) return;
    setDraft(draftFromPersona(persona));
  }

  async function run() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/balance-simulation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personaId,
          days: Number(days) || 365,
          seed: Number(seed) || 12_345,
          lessonGate: lessonGate.trim() === "" ? null : Number(lessonGate),
          throttleLessonsOnBacklog: throttle,
          compareSittings: Boolean(personaId) && compareSittings,
          overrides: persona && draft ? overridesFromDraft(draft, persona) : undefined,
        }),
      });
      const payload = (await response.json()) as BalanceRunResponse;
      if (!response.ok) throw new Error(payload.error ?? copy.failed);
      setResult(payload);
      showToast({ tone: "success", message: copy.ran });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : copy.failed });
    } finally {
      setBusy(false);
    }
  }

  if (personas === null) {
    return <p className="text-sm font-semibold text-foreground/60">{copy.loading}</p>;
  }

  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader
        label={copy.label}
        title={copy.title}
        description={copy.description}
        actions={
          <>
            {persona ? (
              <button type="button" onClick={reset} className={`${BUTTON} border border-line text-foreground/70`}>
                {copy.reset}
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={run} className={`${BUTTON} bg-accent text-white hover:brightness-110`}>
              {busy ? copy.running : copy.run}
            </button>
          </>
        }
      />

      <AdminBalanceSimulatorControls
        personas={personas}
        personaId={personaId}
        onPersona={choose}
        days={days}
        onDays={setDays}
        seed={seed}
        onSeed={setSeed}
        lessonGate={lessonGate}
        onLessonGate={setLessonGate}
        throttle={throttle}
        onThrottle={setThrottle}
        compareSittings={compareSittings}
        onCompareSittings={setCompareSittings}
        draft={draft}
        onDraft={setDraft}
      />

      {result === null ? (
        <p className="mt-4 text-sm font-semibold text-foreground/60">{copy.idle}</p>
      ) : (
        <>
          <p className="mt-4 text-[12px] font-black text-foreground/70">
            {copy.ranTitle(result.days, result.rows.length)}
          </p>
          <AdminBalanceSimulatorTable rows={result.rows} />

          {result.sittings ? (
            <div className="mt-6">
              <h3 className="text-sm font-black text-foreground">{copy.sittingsTitle}</h3>
              <p className="mt-0.5 max-w-4xl text-[12px] font-semibold leading-relaxed text-foreground/70">
                {copy.sittingsBlurb}
              </p>
              <AdminBalanceSimulatorTable rows={result.sittings} />
            </div>
          ) : null}

          <div className="mt-6">
            <h3 className="text-sm font-black text-foreground">{copy.importTitle}</h3>
            <p className="mt-0.5 max-w-4xl text-[12px] font-semibold leading-relaxed text-foreground/70">
              {copy.importBlurb}
            </p>
            <AdminBalanceImportTable verdicts={result.imports} />
          </div>
        </>
      )}
    </section>
  );
}
