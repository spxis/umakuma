"use client";

import { useEffect, useState } from "react";
import type { AdminUsersPanelProps } from "./AdminUsersPanel.types";

import { useAdminFeedback } from "./AdminFeedbackProvider";
import AdminAccountsSection from "./AdminAccountsSection";
import { ADMIN_USERS_COPY } from "./AdminUsers.constants";
import type { AdminAccount } from "./AdminAccountsSection.types";
import ModalShell from "@/app/shared/ModalShell";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";

const COPY = ADMIN_USERS_COPY;

function actionButtonClassName(isPrimary: boolean): string {
  return `inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-bold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isPrimary
      ? "border-accent bg-accent text-white"
      : "border-line bg-surface text-slate-700 hover:bg-surface-muted"
  }`;
}

export default function AdminUsersPanel({
  sessionAuthorized,
  checkingSession,
  viewerEmail,
  loading,
  nickname,
  token,
  operationScope,
  onSetNickname,
  onSetToken,
  onAddAccount,
  onRefreshAll,
}: AdminUsersPanelProps) {
  const { showToast, confirmAction } = useAdminFeedback();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [generatedInviteCodesByAccountId, setGeneratedInviteCodesByAccountId] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  async function loadAccounts() {
    const response = await fetch("/api/admin/accounts", {
      cache: "no-store",
    });
    const data = (await response.json()) as { accounts?: AdminAccount[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? COPY.panel.loadFailed);
    }
    setAccounts(data.accounts ?? []);
  }

  useEffect(() => {
    if (checkingSession) {
      return;
    }

    if (!sessionAuthorized) {
      setAccounts([]);
      return;
    }

    void loadAccounts().catch(() => {
      showToast({ tone: "error", message: COPY.panel.loadFailed });
    });
  }, [checkingSession, sessionAuthorized, showToast]);

  async function refreshOne(accountId: string) {
    const target = accounts.find((account) => account.id === accountId);
    const accepted = await confirmAction({
      title: COPY.confirm.refreshTitle,
      description: COPY.confirm.refreshDescription(target?.nickname ?? COPY.confirm.fallbackNickname),
      confirmLabel: COPY.confirm.refreshConfirmLabel,
      cancelLabel: COPY.confirm.cancelLabel,
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/admin/accounts/${accountId}/refresh`, {
        method: "POST",
      });

      const data = (await response.json()) as { error?: string; refreshed?: boolean; reason?: string };
      if (!response.ok) {
        throw new Error(data.error ?? COPY.toasts.refreshFailed);
      }

      if (!data.refreshed && data.reason) {
        showToast({ tone: "error", message: `${COPY.toasts.refreshSkippedPrefix} ${data.reason}` });
      } else {
        showToast({ tone: "success", message: COPY.toasts.refreshed });
      }

      await loadAccounts();
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : COPY.toasts.refreshFailed });
    } finally {
      setBusy(false);
    }
  }

  async function assignInviteCode(accountId: string): Promise<string | null> {
    const target = accounts.find((account) => account.id === accountId);
    const accepted = await confirmAction({
      title: COPY.confirm.setInviteTitle,
      description: COPY.confirm.setInviteDescription(target?.nickname ?? COPY.confirm.fallbackNickname),
      confirmLabel: COPY.confirm.setInviteConfirmLabel,
      cancelLabel: COPY.confirm.cancelLabel,
      tone: "danger",
    });

    if (!accepted) {
      return null;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/admin/accounts/${accountId}/invite-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as { error?: string; inviteCode?: string };
      if (!response.ok) {
        throw new Error(data.error ?? COPY.toasts.inviteAssignFailed);
      }

      await loadAccounts();
      if (data.inviteCode) {
        setGeneratedInviteCodesByAccountId((prev) => ({ ...prev, [accountId]: data.inviteCode! }));
      }
      showToast({
        tone: "success",
        message: data.inviteCode
          ? COPY.toasts.inviteGeneratedWithCode(data.inviteCode)
          : COPY.toasts.inviteGenerated,
      });

      return data.inviteCode ?? null;
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : COPY.toasts.inviteAssignFailed });
      return null;
    } finally {
      setBusy(false);
    }
  }

  /*
   * Internal is the family and the helpers, and it decides one thing: who is
   * offered the reading challenge. No confirmation - it is a flag that toggles
   * straight back, and neither direction loses anything.
   */
  async function setInternal(accountId: string, internal: boolean) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/accounts/${accountId}/internal`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ internal }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? COPY.toasts.internalFailed);
      }
      await loadAccounts();
      showToast({ tone: "success", message: internal ? COPY.toasts.internalOn : COPY.toasts.internalOff });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : COPY.toasts.internalFailed });
    } finally {
      setBusy(false);
    }
  }

  async function resetInviteCode(accountId: string) {
    const target = accounts.find((account) => account.id === accountId);
    const accepted = await confirmAction({
      title: COPY.confirm.resetInviteTitle,
      description: COPY.confirm.resetInviteDescription(target?.nickname ?? COPY.confirm.fallbackNickname),
      confirmLabel: COPY.confirm.resetInviteConfirmLabel,
      cancelLabel: COPY.confirm.cancelLabel,
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/admin/accounts/${accountId}/invite-code`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? COPY.toasts.inviteResetFailed);
      }

      await loadAccounts();
      setGeneratedInviteCodesByAccountId((prev) => {
        if (!(accountId in prev)) {
          return prev;
        }

        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      showToast({ tone: "success", message: COPY.toasts.inviteReset });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : COPY.toasts.inviteResetFailed });
    } finally {
      setBusy(false);
    }
  }

  async function refreshAllUsers() {
    const accepted = await confirmAction({
      title: COPY.confirm.refreshAllTitle,
      description: COPY.confirm.refreshAllDescription(
        String(operationScope?.counts.accountsTotal ?? COPY.confirm.fallbackScopeCount),
        String(operationScope?.estimates.refreshAllMinutes ?? COPY.confirm.fallbackScopeCount),
      ),
      confirmLabel: COPY.confirm.refreshAllConfirmLabel,
      cancelLabel: COPY.confirm.cancelLabel,
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    await onRefreshAll();
    await loadAccounts();
  }

  return (
    <>
      {checkingSession ? (
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">{COPY.panel.checkingSession}</p>
      ) : null}

      {!checkingSession && !sessionAuthorized ? (
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">
          {COPY.panel.signedOut}
        </p>
      ) : null}

      {sessionAuthorized ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={loading || busy}
            className={actionButtonClassName(true)}
          >
            {COPY.toolbar.addUser}
          </button>
          <button
            type="button"
            onClick={() => {
              void refreshAllUsers();
            }}
            disabled={loading || busy}
            className={actionButtonClassName(false)}
          >
            {COPY.toolbar.refreshAllStats}
          </button>
        </div>
      ) : null}

      <AdminAccountsSection
        sessionAuthorized={sessionAuthorized}
        accounts={accounts}
        loading={loading || busy}
        viewerEmail={viewerEmail}
        generatedInviteCodesByAccountId={generatedInviteCodesByAccountId}
        onRefreshOne={refreshOne}
        onAssignInviteCode={assignInviteCode}
        onResetInviteCode={resetInviteCode}
        onSetInternal={setInternal}
      />

      {isAddModalOpen ? (
        <ModalShell
          onClose={() => setIsAddModalOpen(false)}
          layer={MODAL_LAYERS.menu}
          label={COPY.addModal.title}
          scrim="light"
          gutter="md"
          panelClassName="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-[0_20px_55px_rgba(8,16,36,0.25)]"
        >
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/60">{COPY.addModal.label}</p>
            <h3 className="mt-1 text-xl font-bold text-foreground">{COPY.addModal.title}</h3>
            <p className="mt-2 text-sm text-foreground/80">{COPY.addModal.description}</p>

            <form
              className="mt-4 space-y-3"
              onSubmit={async (event) => {
                await onAddAccount(event);
                if (!nickname.trim() && !token.trim()) {
                  setIsAddModalOpen(false);
                }
                await loadAccounts();
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">{COPY.addModal.nicknameLabel}</span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={32}
                  value={nickname}
                  onChange={(event) => onSetNickname(event.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder={COPY.addModal.nicknamePlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">{COPY.addModal.tokenLabel}</span>
                <input
                  type="password"
                  required
                  value={token}
                  onChange={(event) => onSetToken(event.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder={COPY.addModal.tokenPlaceholder}
                />
              </label>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted"
                >
                  {COPY.addModal.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading || busy}
                  className="rounded-full border border-accent bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {COPY.addModal.save}
                </button>
              </div>
            </form>
        </ModalShell>
      ) : null}
    </>
  );
}
