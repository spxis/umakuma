"use client";

import { useState, type FormEvent } from "react";

import {
  ACCOUNT_VISIBILITY_DISPLAY,
  ACCOUNT_VISIBILITY_VALUES,
  VISIBILITY_REASSURANCE,
  type AccountVisibility,
} from "@/lib/accountVisibility";

import WelcomeJlptStep from "./WelcomeJlptStep";
import WelcomePlacementStep from "./WelcomePlacementStep";
import WelcomeWanikaniStep from "./WelcomeWanikaniStep";
import { WELCOME_COPY } from "./welcomeCopy";

type Props = {
  suggestedName: string;
  defaultVisibility: AccountVisibility;
  askDisplayName: boolean;
  askVisibility: boolean;
};

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

/**
 * The questions asked once, before an account exists.
 *
 * Which questions appear is the admin's choice, so both are optional: with
 * both off this is a single button, and the account takes the name from Google
 * and the visibility the admin set as the starting value.
 */
export default function WelcomeForm({ suggestedName, defaultVisibility, askDisplayName, askVisibility }: Props) {
  const [name, setName] = useState(suggestedName);
  const [seenBy, setSeenBy] = useState<AccountVisibility>(defaultVisibility);
  const [state, setState] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  /*
   * The account is created by the first step; the rest attach to it. Each step
   * writes as it completes, so leaving halfway keeps whatever was answered
   * rather than losing the account entirely.
   */
  const [accountId, setAccountId] = useState<string | null>(null);
  const [step, setStep] = useState<"identity" | "wanikani" | "placement" | "jlpt">("identity");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setError(null);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: askDisplayName ? name : null,
        visibility: askVisibility ? seenBy : undefined,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? WELCOME_COPY.failed);
      setState("idle");
      return;
    }

    const payload = await response.json().catch(() => null);
    const id = payload?.account?.id ?? null;
    if (!id) {
      // Nothing to attach the optional steps to; the page will route them.
      finish();
      return;
    }

    setAccountId(id);
    setStep("wanikani");
    setState("idle");
  }

  /* The welcome page decides where they land, so re-enter it rather than
   * guessing here whether they are waiting for approval. */
  function finish() {
    window.location.href = "/welcome";
  }

  if (step === "wanikani" && accountId) {
    return <WelcomeWanikaniStep accountId={accountId} onDone={() => setStep("placement")} />;
  }

  /* After WaniKani and before the JLPT question, because it is the only step
     that changes what the member is taught: the placement offers to bring the
     progress they may have just connected, and the JLPT answer is a line on a
     profile either way. */
  if (step === "placement" && accountId) {
    return <WelcomePlacementStep accountId={accountId} onDone={() => setStep("jlpt")} />;
  }

  if (step === "jlpt" && accountId) {
    return <WelcomeJlptStep accountId={accountId} onDone={finish} />;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {askDisplayName ? (
        <div>
          <label htmlFor="welcomeName" className="text-sm font-black text-foreground">
            {WELCOME_COPY.nameHeading}
          </label>
          <input
            id="welcomeName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={WELCOME_COPY.namePlaceholder}
            className={`${FIELD_CLASS} mt-2`}
          />
          <p className="mt-1 text-xs text-foreground/60">{WELCOME_COPY.nameHint}</p>
        </div>
      ) : null}

      {askVisibility ? (
        <fieldset>
          <legend className="text-sm font-black text-foreground">{WELCOME_COPY.visibilityHeading}</legend>
          <div className="mt-2 space-y-2">
            {ACCOUNT_VISIBILITY_VALUES.map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  seenBy === value ? "border-accent bg-accent/5" : "border-line hover:bg-surface-muted"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={seenBy === value}
                  onChange={() => setSeenBy(value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-bold text-foreground">
                    {ACCOUNT_VISIBILITY_DISPLAY[value].label}
                  </span>
                  <span className="block text-xs text-foreground/60">
                    {ACCOUNT_VISIBILITY_DISPLAY[value].description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-foreground/60">{VISIBILITY_REASSURANCE}</p>
        </fieldset>
      ) : null}

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={state === "saving"}
        className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:opacity-60"
      >
        {state === "saving" ? WELCOME_COPY.submitting : WELCOME_COPY.submit}
      </button>
    </form>
  );
}
