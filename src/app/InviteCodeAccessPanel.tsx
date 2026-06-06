"use client";

import Link from "next/link";
import { useState } from "react";

export type InviteSessionStatus = {
  signedIn?: boolean;
  account?: {
    id: string;
    nickname: string;
    wkUsername: string;
  };
  error?: string;
};

type Props = {
  initialSession: InviteSessionStatus;
};

export default function InviteCodeAccessPanel({ initialSession }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<InviteSessionStatus>(initialSession);
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "error"; message: string }>({
    kind: "idle",
    message: "",
  });

  async function submitInviteCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/invite/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const payload = (await response.json()) as InviteSessionStatus;
      if (!response.ok || !payload.account?.wkUsername) {
        throw new Error(payload.error ?? "Invite code is invalid.");
      }

      setSession({ signedIn: true, account: payload.account });
      setStatus({ kind: "ok", message: `Welcome ${payload.account.nickname}. Redirecting...` });
      window.location.href = `/users/${encodeURIComponent(payload.account.wkUsername)}?tab=study`;
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not sign in with invite code.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function signOutInviteSession() {
    setLoading(true);
    setStatus({ kind: "idle", message: "" });

    try {
      await fetch("/api/invite/session", { method: "DELETE" });
      setSession({ signedIn: false });
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-muted p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/65">Invite Access</p>

      {session.signedIn && session.account ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-foreground/85">
            Signed in as {session.account.nickname} (@{session.account.wkUsername})
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/users/${encodeURIComponent(session.account.wkUsername)}?tab=study`}
              className="inline-flex h-10 items-center justify-center rounded-full border border-accent/30 bg-accent/10 px-4 text-xs font-black uppercase tracking-[0.12em] text-accent"
            >
              Open My Page
            </Link>
            <button
              type="button"
              onClick={() => {
                void signOutInviteSession();
              }}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign Out Invite
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submitInviteCode} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            value={code}
            onChange={(event) => {
              const normalized = event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase();
              setCode(normalized.slice(0, 6));
            }}
            placeholder="ABC123"
            className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-center text-base font-black uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Use Invite Code"}
          </button>
        </form>
      )}

      {status.message ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
            status.kind === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
