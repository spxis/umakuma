"use client";

import { useState } from "react";

import type { AdminAccountDetailPayload, XpAwardOutcome } from "@/lib/adminAccountDetail.types";
import { formatDateTimeShort } from "@/lib/timeFormat";

import { useAdminFeedback } from "@/app/admin/AdminFeedbackProvider";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import type { AdminUserXpProps } from "./AdminUserDetail.types";
import { capLine, capWarning } from "./adminUserDetail.helpers";

/**
 * Handing a member XP: which award, how much, and what it was for.
 *
 * The amount starts at what the chosen award is normally worth and is the
 * admin's to change - that is the whole point of the form. Changing the award
 * re-seeds the amount in the select's own handler rather than in an effect, so
 * there is no render that writes state; an amount the admin has already typed
 * for one award has no claim on the next one.
 *
 * The cap line and the warning under it are the honest half. The cap does not
 * trim an admin award, but the award lands on the day's row for its kind and
 * the cap is read off that row, so an award past a cap spends the rest of this
 * member's day for that kind. Said here, before the click.
 */
export default function AdminUserXpAward({
  account,
  busy,
  setBusy,
  onChanged,
  xpTypes,
  recentXpEvents,
}: AdminUserXpProps) {
  const { showToast, confirmAction } = useAdminFeedback();
  const [kindId, setKindId] = useState(() => xpTypes[0]?.id ?? "");
  const [amount, setAmount] = useState(() => String(xpTypes[0]?.amount ?? 0));
  const [note, setNote] = useState("");

  const selected = xpTypes.find((type) => type.id === kindId) ?? null;
  const parsedAmount = Number(amount);
  const amountIsUsable = Number.isInteger(parsedAmount) && parsedAmount >= 1;
  const warning = capWarning(selected, parsedAmount);

  async function award() {
    if (!selected || !amountIsUsable) return;

    const accepted = await confirmAction({
      title: COPY.xp.confirmTitle,
      description: COPY.xp.confirmDescription(account.nickname, parsedAmount, selected.label),
      confirmLabel: COPY.xp.confirmLabel,
      cancelLabel: COPY.standing.cancelLabel,
      tone: "danger",
    });
    if (!accepted) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}/xp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: selected.id, amount: parsedAmount, note: note.trim() || null }),
      });
      const payload = (await response.json()) as AdminAccountDetailPayload & {
        award?: XpAwardOutcome;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? COPY.xp.failed);

      onChanged(payload);
      setNote("");
      showToast({
        tone: "success",
        message: payload.award?.rankedUp
          ? COPY.xp.awardedRankUp(payload.award.awarded, payload.account.xpRankName)
          : COPY.xp.awarded(payload.award?.awarded ?? parsedAmount, payload.account.xp),
      });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : COPY.xp.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.xp.heading}</h2>
      <p className={S.blurb}>{COPY.xp.blurb}</p>

      {xpTypes.length === 0 ? (
        <p className="mt-3 text-[12px] font-semibold text-foreground/60">{COPY.xp.empty}</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className={S.label}>{COPY.xp.type}</span>
              <select
                value={kindId}
                onChange={(event) => {
                  const next = xpTypes.find((type) => type.id === event.target.value) ?? null;
                  setKindId(event.target.value);
                  setAmount(String(next?.amount ?? 0));
                }}
                className={S.field}
              >
                {xpTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.retired ? `${type.label} ${COPY.xp.retiredSuffix}` : type.label}
                  </option>
                ))}
              </select>
              <span className={S.hint}>{selected ? selected.note : ""}</span>
            </label>

            <label className="flex flex-col gap-1">
              <span className={S.label}>{COPY.xp.amount}</span>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={`${S.field} tabular-nums`}
              />
              <span className={S.hint}>{selected ? capLine(selected) : COPY.xp.amountHint}</span>
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={S.label}>{COPY.xp.note}</span>
              <input
                value={note}
                maxLength={280}
                placeholder={COPY.xp.notePlaceholder}
                onChange={(event) => setNote(event.target.value)}
                className={S.field}
              />
              <span className={S.hint}>{COPY.xp.noteHint}</span>
            </label>
          </div>

          {warning ? <p className={S.warning}>{warning}</p> : null}

          <button
            type="button"
            disabled={busy || !selected || !amountIsUsable}
            onClick={() => void award()}
            className={`${S.button} ${S.primaryButton} mt-3`}
          >
            {busy ? COPY.xp.awarding : COPY.xp.award}
          </button>
        </>
      )}

      <h3 className={`${S.heading} mt-5`}>{COPY.xp.recentHeading}</h3>
      <p className={S.blurb}>{COPY.xp.recentBlurb}</p>
      {recentXpEvents.length === 0 ? (
        <p className="mt-2 text-[12px] font-semibold text-foreground/60">{COPY.xp.recentEmpty}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {recentXpEvents.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline gap-2 rounded-lg bg-surface-muted px-2 py-1.5">
              <span className="text-[12px] font-black tabular-nums text-foreground">{event.amount}</span>
              <span className="text-[12px] font-bold text-foreground/80">
                {xpTypes.find((type) => type.id === event.kind)?.label ?? event.kind}
              </span>
              {event.note ? (
                <span className="min-w-0 truncate text-[11px] font-semibold text-foreground/60">{event.note}</span>
              ) : null}
              <span className="ml-auto text-[10px] font-semibold tabular-nums text-foreground/60">
                {event.dayKey} - {formatDateTimeShort(event.updatedAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
