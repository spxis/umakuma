"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { connectWanikaniToken } from "@/app/shared/connectWanikani";

import { CONNECT_COPY } from "./connectCopy";

type Props = {
  accountId: string;
  /** An account that already has a token asks before replacing it. */
  connected: boolean;
};

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
const PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:opacity-60";
const QUIET =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-foreground/70 transition hover:bg-surface-muted";

/**
 * The token field, on the page a member comes back to.
 *
 * The wizard's step and this one post the same request to the same route -
 * that part is shared - and differ in what happens next. There, connecting
 * advances a step. Here the page itself is the answer, so a success reloads
 * the server component and the member reads their own connection back rather
 * than a confirmation that disappears.
 *
 * A connected account keeps the field closed behind a button. Nothing here can
 * read the stored token, so an open field beside a working connection only
 * invites someone to paste over one that is fine.
 */
export default function ConnectWanikaniForm({ accountId, connected }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(!connected);
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "checking">("idle");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState("checking");
    setError(null);

    const outcome = await connectWanikaniToken({
      accountId,
      token,
      fallbackError: CONNECT_COPY.failed,
    });

    if (!outcome.ok) {
      setError(outcome.error);
      setState("idle");
      return;
    }

    setResolvedName(outcome.wkUsername);
    setToken("");
    setState("idle");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="space-y-3">
        {resolvedName ? (
          <p className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm font-bold text-foreground">
            {CONNECT_COPY.connectedAs} {resolvedName}
          </p>
        ) : null}
        <button type="button" onClick={() => setOpen(true)} className={QUIET}>
          {CONNECT_COPY.replace}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connected ? (
        <div>
          <h2 className="text-sm font-black text-foreground">{CONNECT_COPY.replaceHeading}</h2>
          <p className="mt-1 text-sm text-foreground/70">{CONNECT_COPY.replaceBody}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="wkToken" className="text-xs font-black uppercase tracking-[0.08em] text-foreground/60">
          {CONNECT_COPY.tokenLabel}
        </label>
        <input
          id="wkToken"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className={`${FIELD_CLASS} mt-1`}
        />
        <p className="mt-1 text-xs text-foreground/60">{CONNECT_COPY.tokenHint}</p>
      </div>

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={state === "checking" || token.trim().length === 0}
          onClick={() => void submit()}
          className={PRIMARY}
        >
          {state === "checking" ? CONNECT_COPY.connecting : CONNECT_COPY.connect}
        </button>
        {connected ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setToken("");
              setError(null);
            }}
            className={QUIET}
          >
            {CONNECT_COPY.replaceCancel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
