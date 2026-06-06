"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import InviteCodeAccessPanel from "../InviteCodeAccessPanel";

type AuthFlow = "login" | "join";

type JoinStatus = {
  type: "idle" | "ok" | "error";
  message: string;
};

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

function isAuthFlow(value: string | null): value is AuthFlow {
  return value === "login" || value === "join";
}

export default function JoinPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [flow, setFlow] = useState<AuthFlow>("join");
  const [hasHydratedFlow, setHasHydratedFlow] = useState(false);
  const [nickname, setNickname] = useState("");
  const [token, setToken] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<JoinStatus>({ type: "idle", message: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const denied = params.get("access") === "denied";
    const flowFromQuery = params.get("flow");
    setAccessDenied(denied);
    const hasFlowQuery = isAuthFlow(flowFromQuery);
    setFlow(hasFlowQuery ? flowFromQuery : "login");
    setHasHydratedFlow(true);

    async function loadSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await response.json()) as SessionStatus;
        const isSignedIn = Boolean(data.signedIn);
        setSignedIn(isSignedIn);
        setUserName(data.user?.name ?? null);
        setUserEmail(data.user?.email ?? null);

        if (hasFlowQuery && flowFromQuery === "join" && !isSignedIn) {
          setFlow("login");
          return;
        }

        if (!hasFlowQuery) {
          setFlow(isSignedIn ? "join" : "login");
        }
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
    if (flow === "join") {
      params.delete("flow");
    } else {
      params.set("flow", flow);
    }

    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [flow, hasHydratedFlow]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname, token }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not join leaderboard.");
      }

      setToken("");
      setStatus({
        type: "ok",
        message: "You joined the leaderboard. Return to home page to see your rank.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not join leaderboard.",
      });
    } finally {
      setLoading(false);
    }
  }

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
              You do not have access to that user page yet. Join with your Google account or use your invite code.
            </div>
          ) : null}

          <div className="mb-5 inline-flex rounded-full border border-line bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setFlow("login")}
              aria-pressed={flow === "login"}
              className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                flow === "login"
                  ? "border border-line bg-surface text-foreground"
                  : "text-foreground/70 hover:bg-surface"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setFlow("join")}
              disabled={checking || !signedIn}
              aria-pressed={flow === "join"}
              className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                flow === "join"
                  ? "border border-line bg-surface text-foreground"
                  : "text-foreground/70 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              }`}
            >
              Join
            </button>
          </div>

          {flow === "login" ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Account access</p>
              <h1 className="mt-2 text-4xl leading-[0.95] text-foreground sm:text-5xl">Log in</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                Use an invite code for direct access, or sign in with Google for account setup and admin access.
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <InviteCodeAccessPanel postLoginCallbackUrl="/join" />

                <aside className="rounded-2xl border border-line bg-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/70">Google</p>
                  <p className="mt-1 text-sm text-foreground/75">
                    Sign in with Google before joining with your token.
                  </p>
                  {checking ? (
                    <p className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-foreground/70">
                      Checking your Google session...
                    </p>
                  ) : signedIn ? (
                    <>
                      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                        Signed in{userEmail ? ` as ${userEmail}` : " with Google"}.
                      </p>
                      <p className="mt-2 text-xs font-semibold text-foreground/70">
                        Ready to join. Use the Join tab above.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href="/signout?callbackUrl=/join?flow=login"
                          className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted"
                        >
                          Sign out
                        </Link>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void startGoogleSignIn("/join");
                      }}
                      className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted"
                    >
                      Sign in with Google
                    </button>
                  )}
                </aside>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Create account</p>
              <h1 className="mt-2 text-4xl leading-[0.95] text-foreground sm:text-5xl">Join UmaKuma</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                Connect Google first, then submit your display name and WaniKani token.
              </p>

              {checking ? (
                <div className="mt-4 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm font-semibold text-foreground/70">
                  Checking your Google session...
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-700 sm:text-base">
                    Active account: <span className="font-bold text-foreground">{userName ?? "Google user"}</span>
                    {userEmail ? <span className="text-foreground/70"> ({userEmail})</span> : null}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
                      Google connected
                    </span>
                    <Link
                      href="/signout?callbackUrl=/join"
                      className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted"
                    >
                      Sign out
                    </Link>
                  </div>
                </>
              )}
            </>
          )}

          {flow === "join" && signedIn ? (
            <form onSubmit={join} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                  Display name
                </span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={32}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="How your name appears on leaderboard"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                  WaniKani API token
                </span>
                <input
                  type="password"
                  required
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Paste personal token"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Joining..." : "Join leaderboard"}
              </button>
            </form>
          ) : null}

          {flow === "join" && status.message ? (
            <p
              className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
                status.type === "error"
                  ? "border border-red-200 bg-red-50 text-red-800"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {status.message}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
