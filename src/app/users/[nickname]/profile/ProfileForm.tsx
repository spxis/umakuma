"use client";

import { useState, type FormEvent } from "react";

import {
  ACCOUNT_VISIBILITY_DISPLAY,
  ACCOUNT_VISIBILITY_VALUES,
  VISIBILITY_REASSURANCE,
  resolveVisibility,
} from "@/lib/accountVisibility";
import {
  JLPT_CERTIFICATION_STATUSES,
  JLPT_CERTIFICATION_STATUS_VALUES,
  JLPT_FIRST_YEAR,
  jlptSystemForYear,
  levelsForSystem,
} from "@/lib/jlptCertification";

import { JLPT_STATUS_LABELS, PROFILE_COPY } from "./profileCopy";

type Props = {
  accountId: string;
  displayName: string | null;
  visibility: string | null;
  jlptStatus: string | null;
  jlptYear: number | null;
  jlptLevel: number | null;
};

const FIELD_CLASS =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

/**
 * The bits of a profile its owner controls.
 *
 * The year is asked before the level because the year decides which test
 * applies: sittings up to 2009 ran four levels counting down from 1, and from
 * 2010 five counting down from N1. Offering N3 for a 2005 sitting would invite
 * an answer that never existed.
 */
export default function ProfileForm({ accountId, displayName, visibility, jlptStatus, jlptYear, jlptLevel }: Props) {
  const [name, setName] = useState(displayName ?? "");
  const [seenBy, setSeenBy] = useState(resolveVisibility(visibility));
  const [status, setStatus] = useState(jlptStatus ?? JLPT_CERTIFICATION_STATUSES.none);
  const [year, setYear] = useState(jlptYear ? String(jlptYear) : "");
  const [level, setLevel] = useState(jlptLevel ? String(jlptLevel) : "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const parsedYear = Number.parseInt(year, 10);
  const system = Number.isFinite(parsedYear) ? jlptSystemForYear(parsedYear) : null;
  const levels = system ? levelsForSystem(system) : [];
  const asksForLevel = status === JLPT_CERTIFICATION_STATUSES.passed;
  const thisYear = new Date().getUTCFullYear();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setError(null);

    const response = await fetch(`/api/accounts/${accountId}/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: name,
        visibility: seenBy,
        jlptStatus: status,
        jlptYear: asksForLevel && year ? parsedYear : null,
        jlptLevel: asksForLevel && level ? Number.parseInt(level, 10) : null,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? PROFILE_COPY.saveFailed);
      setState("idle");
      return;
    }

    setState("saved");
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/55">
          {PROFILE_COPY.displayName}
        </label>
        <input
          id="displayName"
          value={name}
          onChange={(event) => { setName(event.target.value); setState("idle"); }}
          placeholder={PROFILE_COPY.displayNamePlaceholder}
          className={`${FIELD_CLASS} mt-1`}
        />
        <p className="mt-1 text-xs text-foreground/50">{PROFILE_COPY.displayNameHint}</p>
      </div>

      <fieldset>
        <legend className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/55">
          {PROFILE_COPY.visibility}
        </legend>
        <p className="mb-2 text-xs text-foreground/50">{PROFILE_COPY.visibilityHint}</p>

        <div className="space-y-2">
          {ACCOUNT_VISIBILITY_VALUES.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                seenBy === value ? "border-accent bg-accent/5" : "border-line hover:bg-surface-muted"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={value}
                checked={seenBy === value}
                onChange={() => { setSeenBy(value); setState("idle"); }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-bold text-foreground">
                  {ACCOUNT_VISIBILITY_DISPLAY[value].label}
                </span>
                <span className="block text-xs text-foreground/60">
                  {ACCOUNT_VISIBILITY_DISPLAY[value].description}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-foreground/55">{VISIBILITY_REASSURANCE}</p>
      </fieldset>

      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/55">{PROFILE_COPY.jlpt}</p>
        <p className="mb-2 text-xs text-foreground/50">{PROFILE_COPY.jlptHint}</p>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">{PROFILE_COPY.jlptStatus}</span>
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value); setState("idle"); }}
              className={FIELD_CLASS}
            >
              {JLPT_CERTIFICATION_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{JLPT_STATUS_LABELS[value] ?? value}</option>
              ))}
            </select>
          </label>

          {asksForLevel ? (
            <>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">{PROFILE_COPY.jlptYear}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={JLPT_FIRST_YEAR}
                  max={thisYear}
                  value={year}
                  onChange={(event) => { setYear(event.target.value); setLevel(""); setState("idle"); }}
                  className={FIELD_CLASS}
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">{PROFILE_COPY.jlptLevel}</span>
                <select
                  value={level}
                  onChange={(event) => { setLevel(event.target.value); setState("idle"); }}
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
      </div>

      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "saving"}
          className="inline-flex h-10 items-center rounded-full bg-accent px-6 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {state === "saving" ? PROFILE_COPY.saving : PROFILE_COPY.save}
        </button>
        {state === "saved" ? (
          <span className="text-xs font-bold text-emerald-700">{PROFILE_COPY.saved}</span>
        ) : null}
      </div>
    </form>
  );
}
