"use client";

import { useState } from "react";

import {
  JLPT_CERTIFICATION_STATUSES,
  JLPT_CERTIFICATION_STATUS_VALUES,
  JLPT_FIRST_YEAR,
  formatJlptLevel,
  jlptSystemForYear,
  levelsForSystem,
} from "@/lib/jlptCertification";
import type { JlptCertificate } from "@/lib/jlptCertificates";

import { JLPT_STATUS_LABELS, PROFILE_COPY } from "./profileCopy";

/**
 * The certificates a member reports holding.
 *
 * Closed until it is asked for. The page used to draw the whole form the
 * moment it loaded, so every visit to a profile opened an editor for something
 * that changes twice a decade - and the form held one certificate, so
 * reporting a new pass quietly erased the last one. A member who has climbed
 * the ladder holds several, and they are listed.
 */
const CHIP =
  "inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface-muted px-3 text-xs font-bold text-foreground";

const FIELD =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

export default function JlptCertificates({
  accountId,
  certificates: initial,
  status,
}: {
  accountId: string;
  certificates: JlptCertificate[];
  status: string | null;
}) {
  const [certificates, setCertificates] = useState(initial);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");
  const [level, setLevel] = useState("");
  const [reported, setReported] = useState(status ?? JLPT_CERTIFICATION_STATUSES.none);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedYear = Number.parseInt(year, 10);
  const system = Number.isFinite(parsedYear) ? jlptSystemForYear(parsedYear) : null;
  const levels = system ? levelsForSystem(system) : [];
  const thisYear = new Date().getUTCFullYear();

  async function add() {
    if (busy || !year || !level) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/accounts/${accountId}/jlpt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ year: parsedYear, level: Number.parseInt(level, 10) }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as
      | { certificates?: JlptCertificate[]; error?: string }
      | null;

    if (!response?.ok) {
      setError(payload?.error ?? PROFILE_COPY.saveFailed);
      setBusy(false);
      return;
    }

    setCertificates(payload?.certificates ?? []);
    setYear("");
    setLevel("");
    setBusy(false);
  }

  /*
   * The status is only asked of a member holding no certificate. Holding one
   * is the answer - somebody with N3 is not "planning to sit one" - so the
   * options offered are the four that are not a pass.
   */
  async function saveStatus(next: string) {
    setReported(next);
    setError(null);
    const response = await fetch(`/api/accounts/${accountId}/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jlptStatus: next }),
    }).catch(() => null);
    if (!response?.ok) setError(PROFILE_COPY.saveFailed);
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/accounts/${accountId}/jlpt/${id}`, { method: "DELETE" }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as
      | { certificates?: JlptCertificate[]; error?: string }
      | null;

    if (!response?.ok) {
      setError(payload?.error ?? PROFILE_COPY.saveFailed);
      setBusy(false);
      return;
    }

    setCertificates(payload?.certificates ?? []);
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{PROFILE_COPY.jlpt}</p>
        {certificates.length === 0 ? (
          <span className="text-sm font-semibold text-foreground/60">
            {JLPT_STATUS_LABELS[reported] ?? PROFILE_COPY.jlptNone}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          className="ml-auto inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted"
        >
          {open
            ? PROFILE_COPY.jlptDone
            : certificates.length === 0
              ? PROFILE_COPY.jlptAddFirst
              : PROFILE_COPY.jlptAddAnother}
        </button>
      </div>

      {certificates.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {certificates.map((certificate) => (
            <li key={certificate.id} className={CHIP}>
              <span>{certificate.label}</span>
              <span className="font-semibold text-foreground/60">{certificate.year}</span>
              {open ? (
                <button
                  type="button"
                  onClick={() => void remove(certificate.id)}
                  disabled={busy}
                  aria-label={PROFILE_COPY.jlptRemoveLabel(certificate.label, certificate.year)}
                  className="text-foreground/60 transition hover:text-rose-600 disabled:opacity-50"
                >
                  ✕
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="mt-3 rounded-xl border border-line bg-surface-muted p-3">
          <p className="mb-2 text-xs text-foreground/60">{PROFILE_COPY.jlptHint}</p>

          {certificates.length === 0 ? (
            <label className="mb-3 block sm:max-w-xs">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">
                {PROFILE_COPY.jlptStatus}
              </span>
              <select value={reported} onChange={(event) => void saveStatus(event.target.value)} className={FIELD}>
                {JLPT_CERTIFICATION_STATUS_VALUES.filter((value) => value !== JLPT_CERTIFICATION_STATUSES.passed).map(
                  (value) => (
                    <option key={value} value={value}>
                      {JLPT_STATUS_LABELS[value] ?? value}
                    </option>
                  ),
                )}
              </select>
            </label>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">
                {PROFILE_COPY.jlptYear}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={JLPT_FIRST_YEAR}
                max={thisYear}
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setLevel("");
                }}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">
                {PROFILE_COPY.jlptLevel}
              </span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                disabled={!system}
                className={`${FIELD} disabled:opacity-50`}
              >
                <option value="">{PROFILE_COPY.jlptNone}</option>
                {levels.map((value) => (
                  <option key={value} value={value}>
                    {system ? formatJlptLevel(system, value) : value}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void add()}
              disabled={busy || !year || !level}
              className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:brightness-95 disabled:opacity-50"
            >
              {busy ? PROFILE_COPY.saving : PROFILE_COPY.jlptAdd}
            </button>
          </div>
          {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
