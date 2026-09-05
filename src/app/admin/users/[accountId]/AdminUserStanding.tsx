"use client";

import { useState } from "react";

import {
  ACCOUNT_APPROVAL_DISPLAY,
  ACCOUNT_APPROVAL_VALUES,
  resolveApproval,
} from "@/lib/accountApproval";
import type { AdminAccountDetailPayload } from "@/lib/adminAccountDetail.types";
import { formatDateTimeShort } from "@/lib/timeFormat";

import { useAdminFeedback } from "@/app/admin/AdminFeedbackProvider";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import type { AdminUserSectionProps } from "./AdminUserDetail.types";

/**
 * Whether this account works, in the two independent senses.
 *
 * Approval answers whether they were ever let in and is the decision made at
 * the door; disabling switches off somebody already inside. They sit in one
 * card because an admin asking "why can this member not get in" wants both
 * answers side by side, and they stay two controls because collapsing them
 * into one would make re-enabling indistinguishable from approving.
 */
export default function AdminUserStanding({ account, busy, setBusy, onChanged }: AdminUserSectionProps) {
  const { showToast, confirmAction } = useAdminFeedback();
  const [reason, setReason] = useState("");
  const disabled = account.disabledAt !== null;

  async function send(url: string, method: string, body: unknown, failure: string, success: string) {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as AdminAccountDetailPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? failure);
      onChanged(payload);
      showToast({ tone: "success", message: success });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : failure });
    } finally {
      setBusy(false);
    }
  }

  /* The approval route answers with the account it changed rather than the
     whole detail - it predates this screen and is shared with the accounts
     list - so this one reloads instead of using the response. */
  async function setApproval(approvalStatus: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}/approval`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      const answer = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(answer.error ?? COPY.standing.approvalFailed);

      const reloaded = await fetch(`/api/admin/accounts/${account.id}`, { cache: "no-store" });
      const payload = (await reloaded.json()) as AdminAccountDetailPayload & { error?: string };
      if (!reloaded.ok) throw new Error(payload.error ?? COPY.standing.approvalFailed);
      onChanged(payload);
      showToast({ tone: "success", message: COPY.standing.approvalSaved });
    } catch (caught) {
      showToast({
        tone: "error",
        message: caught instanceof Error ? caught.message : COPY.standing.approvalFailed,
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleDisabled() {
    const accepted = await confirmAction({
      title: disabled ? COPY.standing.confirmEnableTitle : COPY.standing.confirmDisableTitle,
      description: disabled
        ? COPY.standing.confirmEnableDescription(account.nickname)
        : COPY.standing.confirmDisableDescription(account.nickname),
      confirmLabel: disabled ? COPY.standing.confirmEnableLabel : COPY.standing.confirmDisableLabel,
      cancelLabel: COPY.standing.cancelLabel,
      tone: "danger",
    });
    if (!accepted) return;

    await send(
      `/api/admin/accounts/${account.id}/disabled`,
      "PATCH",
      { disabled: !disabled, reason: disabled ? null : reason.trim() || null },
      COPY.standing.failed,
      disabled ? COPY.standing.enabled : COPY.standing.disabled,
    );
    setReason("");
  }

  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.standing.heading}</h2>
      <p className={S.blurb}>{COPY.standing.blurb}</p>

      <label className="mt-3 flex max-w-xs flex-col gap-1">
        <span className={S.label}>{COPY.standing.approvalLabel}</span>
        <select
          value={resolveApproval(account.approvalStatus)}
          disabled={busy}
          onChange={(event) => void setApproval(event.target.value)}
          className={S.field}
        >
          {ACCOUNT_APPROVAL_VALUES.map((value) => (
            <option key={value} value={value}>
              {ACCOUNT_APPROVAL_DISPLAY[value]}
            </option>
          ))}
        </select>
      </label>

      {disabled ? (
        <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2">
          <p className="text-[12px] font-black text-rose-700">
            {COPY.standing.disabledNotice(formatDateTimeShort(account.disabledAt))}
          </p>
          {account.disabledReason ? (
            <p className="mt-0.5 text-[11px] font-semibold text-rose-700">
              {COPY.standing.disabledReasonLine(account.disabledReason)}
            </p>
          ) : null}
          {account.disabledBy ? (
            <p className="mt-0.5 text-[11px] font-semibold text-rose-700">
              {COPY.standing.disabledByLine(account.disabledBy)}
            </p>
          ) : null}
        </div>
      ) : (
        <label className="mt-3 flex flex-col gap-1">
          <span className={S.label}>{COPY.standing.disableReason}</span>
          <input
            value={reason}
            maxLength={280}
            onChange={(event) => setReason(event.target.value)}
            className={`${S.field} w-full`}
          />
          <span className={S.hint}>{COPY.standing.disableReasonHint}</span>
        </label>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => void toggleDisabled()}
        className={`${S.button} ${disabled ? S.primaryButton : S.dangerButton} mt-3`}
      >
        {busy ? COPY.standing.working : disabled ? COPY.standing.enable : COPY.standing.disable}
      </button>
    </section>
  );
}
