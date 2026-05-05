"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

type SignOutActionButtonProps = {
  callbackUrl: string;
  clearAdmin: boolean;
};

export default function SignOutActionButton({ callbackUrl, clearAdmin }: SignOutActionButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSignOut() {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (clearAdmin) {
        try {
          await fetch("/api/admin/session", { method: "DELETE" });
        } catch {
          // Continue sign-out even if cookie deletion fails.
        }
      }

      const result = await signOut({ callbackUrl, redirect: false });
      window.location.assign(result?.url ?? callbackUrl);
    } catch {
      setSubmitting(false);
      setErrorMessage("Could not sign out automatically. Please try again.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={submitting}
        onClick={() => {
          void onSignOut();
        }}
        className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? <p className="text-xs font-semibold text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
