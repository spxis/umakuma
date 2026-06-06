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

      await signOut({ callbackUrl });
    } catch {
      setSubmitting(false);
      setErrorMessage("Could not sign out automatically. Please try again.");
    }
  }

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        disabled={submitting}
        onClick={() => {
          void onSignOut();
        }}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
