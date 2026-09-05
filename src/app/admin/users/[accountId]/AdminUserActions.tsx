"use client";

import Link from "next/link";

import type { AdminAccountDetailPayload } from "@/lib/adminAccountDetail.types";

import { useAdminFeedback } from "@/app/admin/AdminFeedbackProvider";
import { isManualRefreshOnCooldown } from "@/app/admin/AdminAccountsSection.helpers";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import type { AdminUserSectionProps } from "./AdminUserDetail.types";

/**
 * The per-account jobs that already had routes, gathered onto the screen they
 * belong on.
 *
 * Every one of these was reachable only through a row's overflow menu on the
 * accounts list, which is the wrong home for them: the menu is for acting on a
 * row you are scanning past, and this is the page you open when the member is
 * the subject. The routes are the existing ones - nothing here is a second way
 * to do something that already had one.
 *
 * Deleting an account is deliberately absent. It cascades through study
 * history, tags, game runs and XP, there is no route for it, and disabling
 * answers every case that has come up so far.
 */
export default function AdminUserActions({ account, busy, setBusy, onChanged }: AdminUserSectionProps) {
  const { showToast, confirmAction } = useAdminFeedback();
  const address = account.slug ?? account.wkUsername;
  const onCooldown = isManualRefreshOnCooldown(account.lastSyncedAt);

  async function reload() {
    const response = await fetch(`/api/admin/accounts/${account.id}`, { cache: "no-store" });
    const payload = (await response.json()) as AdminAccountDetailPayload & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? COPY.page.loadFailed);
    onChanged(payload);
  }

  /* One shape for all four: confirm where it costs something, call the route
     that already exists, re-read the account, say what happened in a toast. */
  async function run(input: {
    confirm?: { title: string; description: string; confirmLabel: string };
    request: () => Promise<Response>;
    failure: string;
    success: (body: Record<string, unknown>) => string;
  }) {
    if (input.confirm) {
      const accepted = await confirmAction({ ...input.confirm, cancelLabel: COPY.standing.cancelLabel, tone: "danger" });
      if (!accepted) return;
    }

    setBusy(true);
    try {
      const response = await input.request();
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) throw new Error((body.error as string) ?? input.failure);
      await reload();
      showToast({ tone: "success", message: input.success(body) });
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : input.failure });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.actions.heading}</h2>
      <p className={S.blurb}>{COPY.actions.blurb}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {address ? (
          <Link href={`/users/${encodeURIComponent(address)}`} className={`${S.button} ${S.quietButton}`}>
            {COPY.actions.viewPage}
          </Link>
        ) : null}

        <Link href={`/admin/users/${encodeURIComponent(account.id)}/history`} className={`${S.button} ${S.quietButton}`}>
          {COPY.actions.history}
        </Link>

        <button
          type="button"
          disabled={busy || onCooldown}
          title={onCooldown ? COPY.actions.refreshCooldown : undefined}
          onClick={() =>
            void run({
              confirm: {
                title: COPY.actions.confirmRefreshTitle,
                description: COPY.actions.confirmRefreshDescription(account.nickname),
                confirmLabel: COPY.actions.confirmRefreshLabel,
              },
              request: () => fetch(`/api/admin/accounts/${account.id}/refresh`, { method: "POST" }),
              failure: COPY.actions.refreshFailed,
              success: (body) =>
                body.refreshed === false && typeof body.reason === "string"
                  ? `${COPY.actions.refreshSkippedPrefix} ${body.reason}`
                  : COPY.actions.refreshed,
            })
          }
          className={`${S.button} ${S.quietButton}`}
        >
          {COPY.actions.refresh}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run({
              confirm: {
                title: COPY.actions.confirmSetInviteTitle,
                description: COPY.actions.confirmSetInviteDescription(account.nickname),
                confirmLabel: COPY.actions.confirmSetInviteLabel,
              },
              request: () =>
                fetch(`/api/admin/accounts/${account.id}/invite-code`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({}),
                }),
              failure: COPY.actions.inviteAssignFailed,
              /* The code is shown once, here, because it is stored as a hash
                 and this is the only moment anybody can read it. */
              success: (body) => COPY.actions.inviteGeneratedWithCode(String(body.inviteCode ?? "")),
            })
          }
          className={`${S.button} ${S.quietButton}`}
        >
          {COPY.actions.setInvite}
        </button>

        <button
          type="button"
          disabled={busy || !account.hasInviteCode}
          onClick={() =>
            void run({
              confirm: {
                title: COPY.actions.confirmResetInviteTitle,
                description: COPY.actions.confirmResetInviteDescription(account.nickname),
                confirmLabel: COPY.actions.confirmResetInviteLabel,
              },
              request: () => fetch(`/api/admin/accounts/${account.id}/invite-code`, { method: "DELETE" }),
              failure: COPY.actions.inviteResetFailed,
              success: () => COPY.actions.inviteReset,
            })
          }
          className={`${S.button} ${S.dangerButton}`}
        >
          {COPY.actions.resetInvite}
        </button>

        {/* No confirmation: it toggles straight back and neither direction
            loses anything, which is the same reasoning the accounts list uses. */}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run({
              request: () =>
                fetch(`/api/admin/accounts/${account.id}/internal`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ internal: !account.internal }),
                }),
              failure: COPY.actions.internalFailed,
              success: () => (account.internal ? COPY.actions.internalOff : COPY.actions.internalOn),
            })
          }
          className={`${S.button} ${S.quietButton}`}
        >
          {account.internal ? COPY.actions.makeOrdinary : COPY.actions.makeInternal}
        </button>
      </div>
    </section>
  );
}
