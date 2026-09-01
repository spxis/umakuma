"use client";

import { useState } from "react";

import { WELCOME_COPY } from "./welcomeCopy";

type Props = {
  accountId: string;
  onDone: () => void;
};

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
const PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:opacity-60";
const QUIET =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-foreground/70 transition hover:bg-surface-muted";

/**
 * The optional WaniKani step.
 *
 * Checked against the API before it is stored, so the member sees the username
 * it resolved to rather than finding out days later that they pasted the wrong
 * string. Skipping is a first-class answer, not a way out of a required field:
 * most of the site works without a connection, and the profile page can take
 * one later.
 */
export default function WelcomeWanikaniStep({ accountId, onDone }: Props) {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "checking">("idle");
  const [connected, setConnected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setState("checking");
    setError(null);

    const response = await fetch(`/api/accounts/${accountId}/wanikani`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);

    const payload = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(payload?.error ?? WELCOME_COPY.failed);
      setState("idle");
      return;
    }

    // Show what it resolved to, then move on by itself.
    setConnected(payload?.wkUsername ?? null);
    setState("idle");
    window.setTimeout(onDone, 1200);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-foreground">{WELCOME_COPY.wanikaniHeading}</h2>
        <p className="mt-1 text-sm text-foreground/70">{WELCOME_COPY.wanikaniBody}</p>
      </div>

      {connected ? (
        <p className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm font-bold text-foreground">
          {WELCOME_COPY.wanikaniConnected} {connected}
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="wkToken" className="text-xs font-black uppercase tracking-[0.08em] text-foreground/60">
              {WELCOME_COPY.wanikaniTokenLabel}
            </label>
            <input
              id="wkToken"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={`${FIELD_CLASS} mt-1`}
            />
            <p className="mt-1 text-xs text-foreground/60">{WELCOME_COPY.wanikaniTokenHint}</p>
          </div>

          {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={state === "checking" || token.trim().length === 0}
              onClick={() => void connect()}
              className={PRIMARY}
            >
              {state === "checking" ? WELCOME_COPY.wanikaniConnecting : WELCOME_COPY.wanikaniConnect}
            </button>
            <button type="button" onClick={onDone} className={QUIET}>
              {WELCOME_COPY.wanikaniSkip}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
