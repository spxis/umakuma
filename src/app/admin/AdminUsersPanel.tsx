"use client";

import { type FormEvent, useEffect, useState } from "react";

import type { AdminOperationsScopeResponse } from "./AdminOperationsScope.types";

import { useAdminFeedback } from "./AdminFeedbackProvider";
import AdminAccountsSection, { type AdminAccount } from "./AdminAccountsSection";

type AdminUsersPanelProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
  viewerEmail: string | null;
  loading: boolean;
  nickname: string;
  token: string;
  operationScope: AdminOperationsScopeResponse | null;
  onSetNickname: (value: string) => void;
  onSetToken: (value: string) => void;
  onAddAccount: (event: FormEvent<HTMLFormElement>) => void;
  onRefreshAll: () => Promise<void>;
};

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
    const response = await fetch("/api/accounts", {
      cache: "no-store",
    });
    const data = (await response.json()) as { accounts?: AdminAccount[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Could not load account list.");
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
      showToast({ tone: "error", message: "Could not load account list." });
    });
  }, [checkingSession, sessionAuthorized, showToast]);

  async function refreshOne(accountId: string) {
    const target = accounts.find((account) => account.id === accountId);
    const accepted = await confirmAction({
      title: "Refresh user",
      description: `Scope: 1 account (${target?.nickname ?? "this user"}). Time: usually under 1 minute. Risk: non-destructive stat refresh. Continue?`,
      confirmLabel: "Refresh user",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/accounts/${accountId}/refresh`, {
        method: "POST",
      });

      const data = (await response.json()) as { error?: string; refreshed?: boolean; reason?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Refresh failed.");
      }

      if (!data.refreshed && data.reason) {
        showToast({ tone: "error", message: `Skipped: ${data.reason}` });
      } else {
        showToast({ tone: "success", message: "User refreshed." });
      }

      await loadAccounts();
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not refresh user." });
    } finally {
      setBusy(false);
    }
  }

  async function assignInviteCode(accountId: string): Promise<string | null> {
    const target = accounts.find((account) => account.id === accountId);
    const accepted = await confirmAction({
      title: "Set invite code",
      description:
        `Scope: 1 account (${target?.nickname ?? "this user"}). Time: immediate. Risk: destructive replacement of previous invite access plus additive creation of a new code. Continue?`,
      confirmLabel: "Set invite code",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!accepted) {
      return null;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/accounts/${accountId}/invite-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as { error?: string; inviteCode?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not assign invite code.");
      }

      await loadAccounts();
      if (data.inviteCode) {
        setGeneratedInviteCodesByAccountId((prev) => ({ ...prev, [accountId]: data.inviteCode! }));
      }
      showToast({
        tone: "success",
        message: data.inviteCode
          ? `Invite code generated: ${data.inviteCode} (copied if permitted).`
          : "Invite code generated.",
      });

      return data.inviteCode ?? null;
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not assign invite code." });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function resetInviteCode(accountId: string) {
    const target = accounts.find((account) => account.id === accountId);
    const accepted = await confirmAction({
      title: "Reset invite code",
      description:
        `Scope: 1 account (${target?.nickname ?? "this user"}). Time: immediate. Risk: destructive removal of current invite access until a new code is generated. Continue?`,
      confirmLabel: "Reset invite",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/accounts/${accountId}/invite-code`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not reset invite code.");
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
      showToast({ tone: "success", message: "Invite code reset." });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not reset invite code." });
    } finally {
      setBusy(false);
    }
  }

  async function refreshAllUsers() {
    const accepted = await confirmAction({
      title: "Refresh all stats",
      description:
        `Scope: about ${operationScope?.counts.accountsTotal ?? "-"} accounts. Time: about ${operationScope?.estimates.refreshAllMinutes ?? "-"} minute(s). Risk: non-destructive stat refresh. Continue?`,
      confirmLabel: "Refresh all",
      cancelLabel: "Cancel",
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
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">Checking admin session...</p>
      ) : null}

      {!checkingSession && !sessionAuthorized ? (
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">
          Admin tools are hidden. Sign in with an allowlisted Google account.
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
            Add user
          </button>
          <button
            type="button"
            onClick={() => {
              void refreshAllUsers();
            }}
            disabled={loading || busy}
            className={actionButtonClassName(false)}
          >
            Refresh all stats
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
      />

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add user"
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-[0_20px_55px_rgba(8,16,36,0.25)]"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/60">Users</p>
            <h3 className="mt-1 text-xl font-bold text-foreground">Add user</h3>
            <p className="mt-2 text-sm text-foreground/80">Add a family account with nickname and WaniKani API token.</p>

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
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">Family nickname</span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={32}
                  value={nickname}
                  onChange={(event) => onSetNickname(event.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="e.g. John"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">WaniKani API token</span>
                <input
                  type="password"
                  required
                  value={token}
                  onChange={(event) => onSetToken(event.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Paste personal token"
                />
              </label>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || busy}
                  className="rounded-full border border-accent bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Save user
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
