"use client";

import { useState, type FormEvent } from "react";

import {
  ACCOUNT_VISIBILITY_DISPLAY,
  ACCOUNT_VISIBILITY_VALUES,
  VISIBILITY_REASSURANCE,
  resolveVisibility,
} from "@/lib/accountVisibility";

import { PROFILE_COPY } from "./profileCopy";

type Props = {
  accountId: string;
  displayName: string | null;
  visibility: string | null;
};

const FIELD_CLASS =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

/**
 * The bits of a profile its owner controls: what they are called, and who can
 * see them.
 *
 * The JLPT certificates used to live here as a third field. They are not one
 * answer - a member may hold several - and they save on their own rather than
 * behind this form's Save, so they have a section of their own.
 *
 * Each choice of audience is one line. Three bordered blocks with the
 * description stacked under the label took a third of the page for a question
 * asked once, and pushed everything else below the fold.
 */
export default function ProfileForm({ accountId, displayName, visibility }: Props) {
  const [name, setName] = useState(displayName ?? "");
  const [seenBy, setSeenBy] = useState(resolveVisibility(visibility));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setError(null);

    const response = await fetch(`/api/accounts/${accountId}/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name, visibility: seenBy }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? PROFILE_COPY.saveFailed);
      setState("idle");
      return;
    }

    setState("saved");
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
          {PROFILE_COPY.displayName}
        </label>
        <input
          id="displayName"
          value={name}
          onChange={(event) => { setName(event.target.value); setState("idle"); }}
          placeholder={PROFILE_COPY.displayNamePlaceholder}
          className={`${FIELD_CLASS} mt-1`}
        />
        <p className="mt-1 text-xs text-foreground/60">{PROFILE_COPY.displayNameHint}</p>
      </div>

      <fieldset>
        <legend className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
          {PROFILE_COPY.visibility}
        </legend>
        <p className="mb-2 text-xs text-foreground/60">{PROFILE_COPY.visibilityHint}</p>

        <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
          {ACCOUNT_VISIBILITY_VALUES.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2 transition ${
                seenBy === value ? "bg-accent/5" : "hover:bg-surface-muted"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={value}
                checked={seenBy === value}
                onChange={() => { setSeenBy(value); setState("idle"); }}
                className="self-center"
              />
              <span className="text-sm font-bold text-foreground">{ACCOUNT_VISIBILITY_DISPLAY[value].label}</span>
              <span className="text-xs text-foreground/60">{ACCOUNT_VISIBILITY_DISPLAY[value].description}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-foreground/60">{VISIBILITY_REASSURANCE}</p>
      </fieldset>

      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "saving"}
          className="inline-flex h-10 items-center rounded-full bg-accent px-6 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {state === "saving" ? PROFILE_COPY.saving : PROFILE_COPY.save}
        </button>
        {state === "saved" ? (
          <span className="text-xs font-bold text-emerald-700">{PROFILE_COPY.saved}</span>
        ) : null}
      </div>
    </form>
  );
}
