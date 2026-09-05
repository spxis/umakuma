"use client";

import { useState } from "react";

import type { AdminAccountDetailPayload } from "@/lib/adminAccountDetail.types";
import { MAX_TIME_OFF_GRANT_DAYS } from "@/lib/xp/xpRest";
import { formatDateShort } from "@/lib/timeFormat";

import { useAdminFeedback } from "@/app/admin/AdminFeedbackProvider";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import type { AdminUserTimeOffProps } from "./AdminUserDetail.types";
import { vacationState } from "./adminUserDetail.helpers";

/** The two kinds, named once, so the form and the labels cannot disagree. */
const KINDS = [
  { id: "vacation", label: COPY.timeOff.kindVacation },
  { id: "rest", label: COPY.timeOff.kindRest },
] as const;

/**
 * Granting extra days off, and bringing somebody home early.
 *
 * Vacation is first in the list because it is what was asked for and what an
 * admin is nearly always here to do; rest days are the same decision about the
 * other allowance, and sharing the form costs one select.
 */
export default function AdminUserTimeOff({ account, busy, setBusy, onChanged, rest, grants }: AdminUserTimeOffProps) {
  const { showToast, confirmAction } = useAdminFeedback();
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("vacation");
  const [days, setDays] = useState("7");
  const [note, setNote] = useState("");

  const vacation = vacationState(rest);
  const parsedDays = Number(days);
  const daysUsable = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= MAX_TIME_OFF_GRANT_DAYS;
  const kindLabel = KINDS.find((entry) => entry.id === kind)?.label ?? COPY.timeOff.kindVacation;

  async function grant() {
    if (!daysUsable) return;

    const accepted = await confirmAction({
      title: COPY.timeOff.confirmGrantTitle,
      description: COPY.timeOff.confirmGrantDescription(account.nickname, parsedDays, kindLabel),
      confirmLabel: COPY.timeOff.confirmGrantLabel,
      cancelLabel: COPY.standing.cancelLabel,
      tone: "danger",
    });
    if (!accepted) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}/rest-grant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, days: parsedDays, note: note.trim() || null }),
      });
      const payload = (await response.json()) as AdminAccountDetailPayload & { error?: string };
      /* The refusal verbatim, the way every other form on this screen does it. */
      if (!response.ok) throw new Error(payload.error ?? COPY.timeOff.grantFailed);
      onChanged(payload);
      setNote("");
      showToast({ tone: "success", message: COPY.timeOff.granted(parsedDays, kindLabel) });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : COPY.timeOff.grantFailed });
    } finally {
      setBusy(false);
    }
  }

  async function endVacation() {
    const accepted = await confirmAction({
      title: COPY.timeOff.confirmEndTitle,
      description: COPY.timeOff.confirmEndDescription(account.nickname),
      confirmLabel: COPY.timeOff.confirmEndLabel,
      cancelLabel: COPY.standing.cancelLabel,
      tone: "danger",
    });
    if (!accepted) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}/vacation`, { method: "DELETE" });
      const payload = (await response.json()) as AdminAccountDetailPayload & {
        error?: string;
        endedVacation?: boolean;
        shiftedDays?: number;
        itemsShifted?: number;
      };
      if (!response.ok) throw new Error(payload.error ?? COPY.timeOff.endFailed);
      onChanged(payload);
      showToast({
        tone: "success",
        message: payload.endedVacation
          ? COPY.timeOff.ended(payload.shiftedDays ?? 0, payload.itemsShifted ?? 0)
          : COPY.timeOff.endedNotAway,
      });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : COPY.timeOff.endFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.timeOff.heading}</h2>
      <p className={S.blurb}>{COPY.timeOff.blurb}</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.timeOff.kind}</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as (typeof KINDS)[number]["id"])}
            className={S.field}
          >
            {KINDS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.timeOff.days}</span>
          <input
            type="number"
            min={1}
            max={MAX_TIME_OFF_GRANT_DAYS}
            step={1}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className={`${S.field} tabular-nums`}
          />
          <span className={S.hint}>{COPY.timeOff.daysHint}</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.timeOff.note}</span>
          <input
            value={note}
            maxLength={280}
            onChange={(event) => setNote(event.target.value)}
            className={S.field}
          />
          <span className={S.hint}>{COPY.timeOff.noteHint}</span>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !daysUsable}
          onClick={() => void grant()}
          className={`${S.button} ${S.primaryButton}`}
        >
          {busy ? COPY.timeOff.granting : COPY.timeOff.grant}
        </button>

        {/* Only where there is something to end. An always-present button that
            usually does nothing teaches an admin to distrust the screen. */}
        {vacation.endable ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void endVacation()}
            className={`${S.button} ${S.dangerButton}`}
          >
            {busy ? COPY.timeOff.ending : COPY.timeOff.endVacation}
          </button>
        ) : null}
      </div>

      <h3 className={`${S.heading} mt-5`}>{COPY.timeOff.grantsHeading}</h3>
      {grants.length === 0 ? (
        <p className="mt-2 text-[12px] font-semibold text-foreground/60">{COPY.timeOff.grantsEmpty}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {grants.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline gap-2 rounded-lg bg-surface-muted px-2 py-1.5">
              <span className="text-[12px] font-black tabular-nums text-foreground">
                {COPY.timeOff.grantLine(row.days, row.kind)}
              </span>
              {row.note ? (
                <span className="min-w-0 truncate text-[11px] font-semibold text-foreground/60">{row.note}</span>
              ) : null}
              {/* A grant that has aged out of the rolling year is still on file
                  and no longer counts; saying so beats it silently vanishing. */}
              {row.counting ? null : (
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                  {COPY.timeOff.grantExpired}
                </span>
              )}
              <span className="ml-auto text-[10px] font-semibold text-foreground/60">
                {formatDateShort(row.createdAt)}
                {row.grantedBy ? ` - ${row.grantedBy}` : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
