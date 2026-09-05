"use client";

import { useState } from "react";

import type { AdminAccountDetailPayload } from "@/lib/adminAccountDetail.types";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

import { useAdminFeedback } from "@/app/admin/AdminFeedbackProvider";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import type { AdminUserSectionProps } from "./AdminUserDetail.types";

/**
 * Raising a member's level floor - one of the four things the schema names as
 * able to move it, and the only one that is a person rather than a test.
 *
 * The box starts at the floor that stands and the button is dead until the
 * number is above it, because the route will not lower a floor and a control
 * that silently does nothing is worse than one that is plainly unavailable.
 */
export default function AdminUserLadder({ account, busy, setBusy, onChanged }: AdminUserSectionProps) {
  const { showToast, confirmAction } = useAdminFeedback();
  const [floor, setFloor] = useState(() => String(account.ukLevelFloor));

  const parsed = Number(floor);
  const usable = Number.isInteger(parsed) && parsed > account.ukLevelFloor && parsed <= KANJI_LADDER_LEVELS;

  async function raise() {
    if (!usable) return;

    const accepted = await confirmAction({
      title: COPY.ladder.confirmTitle,
      description: COPY.ladder.confirmDescription(account.nickname, parsed),
      confirmLabel: COPY.ladder.confirmLabel,
      cancelLabel: COPY.standing.cancelLabel,
      tone: "danger",
    });
    if (!accepted) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}/level-floor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ floor: parsed }),
      });
      const payload = (await response.json()) as AdminAccountDetailPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? COPY.ladder.failed);
      onChanged(payload);
      showToast({
        tone: "success",
        message: COPY.ladder.raised(payload.account.ukLevelFloor, payload.account.ukLevel),
      });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : COPY.ladder.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.ladder.heading}</h2>
      <p className={S.blurb}>{COPY.ladder.blurb}</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.ladder.floor}</span>
          <input
            type="number"
            min={1}
            max={KANJI_LADDER_LEVELS}
            value={floor}
            onChange={(event) => setFloor(event.target.value)}
            className={`${S.field} w-24 tabular-nums`}
          />
        </label>
        <button
          type="button"
          disabled={busy || !usable}
          onClick={() => void raise()}
          className={`${S.button} ${S.primaryButton}`}
        >
          {busy ? COPY.ladder.raising : COPY.ladder.raise}
        </button>
      </div>
    </section>
  );
}
