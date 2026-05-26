"use client";

import { useEffect, useState } from "react";

import AdminAccountsSection, { type AdminAccount } from "./AdminAccountsSection";
import type { Status } from "./AdminPage.types";

type AdminUsersPanelProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
  viewerEmail: string | null;
};

export default function AdminUsersPanel({
  sessionAuthorized,
  checkingSession,
  viewerEmail,
}: AdminUsersPanelProps) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [generatedInviteCodesByAccountId, setGeneratedInviteCodesByAccountId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

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
      setStatus({ type: "error", message: "Could not load account list." });
    });
  }, [checkingSession, sessionAuthorized]);

  async function refreshOne(accountId: string) {
    setLoading(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch(`/api/accounts/${accountId}/refresh`, {
        method: "POST",
      });

      const data = (await response.json()) as { error?: string; refreshed?: boolean; reason?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Refresh failed.");
      }

      if (!data.refreshed && data.reason) {
        setStatus({ type: "error", message: `Skipped: ${data.reason}` });
      } else {
        setStatus({ type: "ok", message: "User refreshed." });
      }

      await loadAccounts();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Refresh failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function assignInviteCode(accountId: string): Promise<string | null> {
    setLoading(true);
    setStatus({ type: "idle", message: "" });

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
      setStatus({
        type: "ok",
        message: data.inviteCode
          ? `Invite code generated: ${data.inviteCode} (copied if permitted).`
          : "Invite code generated.",
      });

      return data.inviteCode ?? null;
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not assign invite code.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function resetInviteCode(accountId: string) {
    setLoading(true);
    setStatus({ type: "idle", message: "" });

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
      setStatus({ type: "ok", message: "Invite code reset." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not reset invite code.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {checkingSession ? (
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">Checking admin session...</p>
      ) : null}

      {status.message ? (
        <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${status.type === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {status.message}
        </p>
      ) : null}

      {!checkingSession && !sessionAuthorized ? (
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">
          Admin tools are hidden. Sign in with an allowlisted Google account.
        </p>
      ) : null}

      <AdminAccountsSection
        sessionAuthorized={sessionAuthorized}
        accounts={accounts}
        loading={loading}
        viewerEmail={viewerEmail}
        generatedInviteCodesByAccountId={generatedInviteCodesByAccountId}
        onRefreshOne={refreshOne}
        onAssignInviteCode={assignInviteCode}
        onResetInviteCode={resetInviteCode}
      />
    </>
  );
}
