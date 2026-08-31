"use client";

import { useState } from "react";

import {
  JLPT_CERTIFICATION_STATUSES,
  JLPT_CERTIFICATION_STATUS_VALUES,
  JLPT_FIRST_YEAR,
  jlptSystemForYear,
  levelsForSystem,
} from "@/lib/jlptCertification";

import { JLPT_STATUS_LABELS, PROFILE_COPY } from "../users/[nickname]/profile/profileCopy";
import { WELCOME_COPY } from "./welcomeCopy";

type Props = {
  accountId: string;
  onDone: () => void;
};

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
const PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:opacity-60";
const QUIET =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-foreground/70 transition hover:bg-surface-muted";

/**
 * The optional JLPT step.
 *
 * The year is asked before the level because the year decides which test
 * applies: sittings to 2009 ran four levels counting down from 1, and from 2010
 * five counting down from N1. Offering N3 for a 2005 sitting would invite an
 * answer that never existed, and the route rejects it anyway.
 *
 * Nothing here changes how the member studies. It is on the profile because
 * they may want it there, which is why skipping is offered as plainly as
 * answering.
 */
export default function WelcomeJlptStep({ accountId, onDone }: Props) {
  const [status, setStatus] = useState<string>(JLPT_CERTIFICATION_STATUSES.none);
  const [year, setYear] = useState("");
  const [level, setLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedYear = Number.parseInt(year, 10);
  const system = Number.isFinite(parsedYear) ? jlptSystemForYear(parsedYear) : null;
  const levels = system ? levelsForSystem(system) : [];
  const asksForLevel = status === JLPT_CERTIFICATION_STATUSES.passed;

  async function save() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/accounts/${accountId}/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jlptStatus: status,
        jlptYear: asksForLevel && year ? parsedYear : null,
        jlptLevel: asksForLevel && level ? Number.parseInt(level, 10) : null,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? WELCOME_COPY.failed);
      setSaving(false);
      return;
    }

    onDone();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-foreground">{WELCOME_COPY.jlptHeading}</h2>
        <p className="mt-1 text-sm text-foreground/70">{WELCOME_COPY.jlptBody}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
            {PROFILE_COPY.jlptStatus}
          </span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={FIELD_CLASS}>
            {JLPT_CERTIFICATION_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>{JLPT_STATUS_LABELS[value] ?? value}</option>
            ))}
          </select>
        </label>

        {asksForLevel ? (
          <>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
                {PROFILE_COPY.jlptYear}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={JLPT_FIRST_YEAR}
                max={new Date().getUTCFullYear()}
                value={year}
                onChange={(event) => { setYear(event.target.value); setLevel(""); }}
                className={FIELD_CLASS}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
                {PROFILE_COPY.jlptLevel}
              </span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                disabled={!system}
                className={`${FIELD_CLASS} disabled:opacity-50`}
              >
                <option value="">{PROFILE_COPY.jlptNone}</option>
                {levels.map((value) => (
                  <option key={value} value={value}>
                    {system === "modern" ? `N${value}` : `Level ${value}`}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={() => void save()} className={PRIMARY}>
          {saving ? WELCOME_COPY.finishing : WELCOME_COPY.finish}
        </button>
        <button type="button" onClick={onDone} className={QUIET}>
          {WELCOME_COPY.skip}
        </button>
      </div>
    </div>
  );
}
