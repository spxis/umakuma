"use client";

import { useState } from "react";

import {
  ACCOUNT_VISIBILITY_DISPLAY,
  ACCOUNT_VISIBILITY_VALUES,
  type AccountVisibility,
} from "@/lib/accountVisibility";
import type { AdminAccountDetailPayload } from "@/lib/adminAccountDetail.types";
import { AGE_BAND_VALUES } from "@/lib/srs/ageBand";

import { useAdminFeedback } from "@/app/admin/AdminFeedbackProvider";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import type { AdminUserSectionProps } from "./AdminUserDetail.types";
import { editDraftFrom, editPatchFrom } from "./adminUserDetail.helpers";

/**
 * The four editable details.
 *
 * The draft is seeded once, from the account this component was mounted with,
 * and the parent remounts it on every reload by keying on the revision - which
 * is how the form gets back in step with the server without an effect writing
 * state on render. What the box shows after a save is what the database
 * answered with, not what the click hoped for.
 */
export default function AdminUserEditForm({ account, busy, setBusy, onChanged }: AdminUserSectionProps) {
  const { showToast } = useAdminFeedback();
  const [draft, setDraft] = useState(() => editDraftFrom(account));

  async function save() {
    const patch = editPatchFrom(draft, account);
    if (Object.keys(patch).length === 0) {
      showToast({ tone: "info", message: COPY.edit.nothingChanged });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as AdminAccountDetailPayload & { error?: string };
      /* The refusal verbatim: "Unknown age band." tells whoever is reading it
         which box to look at, where "could not save" sends them nowhere. */
      if (!response.ok) throw new Error(payload.error ?? COPY.edit.failed);
      onChanged(payload);
      showToast({ tone: "success", message: COPY.edit.saved });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : COPY.edit.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.edit.heading}</h2>
      <p className={S.blurb}>{COPY.edit.blurb}</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.edit.nickname}</span>
          <input
            value={draft.nickname}
            minLength={2}
            maxLength={32}
            onChange={(event) => setDraft((prev) => ({ ...prev, nickname: event.target.value }))}
            className={S.field}
          />
          <span className={S.hint}>{COPY.edit.nicknameHint}</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.edit.displayName}</span>
          <input
            value={draft.displayName}
            maxLength={60}
            onChange={(event) => setDraft((prev) => ({ ...prev, displayName: event.target.value }))}
            className={S.field}
          />
          <span className={S.hint}>{COPY.edit.displayNameHint}</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.edit.visibility}</span>
          <select
            value={draft.visibility}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, visibility: event.target.value as AccountVisibility }))
            }
            className={S.field}
          >
            {ACCOUNT_VISIBILITY_VALUES.map((value) => (
              <option key={value} value={value}>
                {ACCOUNT_VISIBILITY_DISPLAY[value].label}
              </option>
            ))}
          </select>
          <span className={S.hint}>{ACCOUNT_VISIBILITY_DISPLAY[draft.visibility].description}</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={S.label}>{COPY.edit.ageBand}</span>
          <select
            value={draft.ageBand}
            onChange={(event) => setDraft((prev) => ({ ...prev, ageBand: event.target.value }))}
            className={S.field}
          >
            {/* Selectable only while it is what the account already holds: the
                column may be null, but an admin setting it back to "not said"
                would be choosing the youngest band by implication rather than
                by decision, and the route has no way to tell those apart. */}
            <option value="" disabled={account.ageBand !== null}>
              {COPY.edit.ageBandUnset}
            </option>
            {AGE_BAND_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span className={S.hint}>{COPY.edit.ageBandHint}</span>
        </label>
      </div>

      <button
        type="button"
        disabled={busy || draft.nickname.trim().length < 2}
        onClick={() => void save()}
        className={`${S.button} ${S.primaryButton} mt-3`}
      >
        {busy ? COPY.edit.saving : COPY.edit.save}
      </button>
    </section>
  );
}
