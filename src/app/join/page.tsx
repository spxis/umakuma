"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InviteCodeAccessPanel from "../InviteCodeAccessPanel";

type AuthFlow = "invite" | "google";

type SessionStatus = {
  signedIn?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

async function startGoogleSignIn(callbackPath: string) {
  try {
    const { signIn } = await import("next-auth/react");
    await signIn("google", { callbackUrl: callbackPath });
  } catch {
    const callbackUrl = encodeURIComponent(callbackPath);
    window.location.assign(`/api/auth/signin/google?callbackUrl=${callbackUrl}`);
  }
}

function normalizeAuthFlow(value: string | null): AuthFlow | null {
  if (value === "invite" || value === "join") {
    return "invite";
  }

  if (value === "google" || value === "login") {
    return "google";
  }

  return null;
}

export default function JoinPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [flow, setFlow] = useState<AuthFlow>("invite");
  const [hasHydratedFlow, setHasHydratedFlow] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const denied = params.get("access") === "denied";
    const flowFromQuery = normalizeAuthFlow(params.get("flow"));
    setAccessDenied(denied);
    setFlow(flowFromQuery ?? "invite");
    setHasHydratedFlow(true);

    async function loadSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await response.json()) as SessionStatus;
        setSignedIn(Boolean(data.signedIn));
        setUserEmail(data.user?.email ?? null);
      } finally {
        setChecking(false);
      }
    }

    void loadSession().catch(() => {
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!hasHydratedFlow) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (flow === "invite") {
      params.delete("flow");
    } else {
      params.set("flow", flow);
    }

    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [flow, hasHydratedFlow]);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative mx-auto w-full max-w-2xl space-y-5">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-surface-muted"
        >
          Back to leaderboard
        </Link>

        <section className="animate-enter rounded-4xl border border-line bg-surface/90 p-6 shadow-[0_24px_80px_rgba(15,111,255,0.15)] backdrop-blur sm:p-8">
          {accessDenied ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              You do not have access to that user page yet. Use your invite code to continue.
            </div>
          ) : null}

          <div className="mb-5 inline-flex rounded-full border border-line bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setFlow("invite")}
              aria-pressed={flow === "invite"}
              className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                flow === "invite"
                  ? "border border-line bg-surface text-foreground"
                  : "text-foreground/70 hover:bg-surface"
              }`}
            >
              Invite code
            </button>
            <button
              type="button"
              onClick={() => setFlow("google")}
              aria-pressed={flow === "google"}
              className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                flow === "google"
                  ? "border border-line bg-surface text-foreground"
                  : "text-foreground/70 hover:bg-surface"
              }`}
            >
              Google
            </button>
          </div>

          {flow === "invite" ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Direct access</p>
              <h1 className="mt-2 text-4xl leading-[0.95] text-foreground sm:text-5xl">Use invite code</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                Enter your 6-character invite code to open your study page directly.
              </p>

              <div className="mt-5 max-w-lg">
                <InviteCodeAccessPanel postLoginCallbackUrl="/join?flow=google" />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Linked account</p>
              <h1 className="mt-2 text-4xl leading-[0.95] text-foreground sm:text-5xl">Sign in with Google</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                Use Google sign-in if your account is already linked.
              </p>

              <div className="mt-5 max-w-lg rounded-2xl border border-line bg-surface-muted p-4">
                {checking ? (
                  <p className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-foreground/70">
                    Checking your Google session...
                  </p>
                ) : signedIn ? (
                  <>
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                      Signed in{userEmail ? ` as ${userEmail}` : " with Google"}.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href="/"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted"
                      >
                        Continue
                      </Link>
                      <Link
                        href="/signout?callbackUrl=/join?flow=google"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted"
                      >
                        Sign out
                      </Link>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-foreground/70">
                      Need first-time access? Use the Invite code tab.
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void startGoogleSignIn("/join?flow=google");
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted"
                  >
                    Sign in with Google
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
