"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

type SignOutActionButtonProps = {
  callbackUrl: string;
  clearAdmin: boolean;
};

export default function SignOutActionButton({ callbackUrl, clearAdmin }: SignOutActionButtonProps) {
  const [submitting, setSubmitting] = useState(false);

  async function onSignOut() {
    setSubmitting(true);

    if (clearAdmin) {
      try {
        await fetch("/api/admin/session", { method: "DELETE" });
      } catch {
        // Continue sign-out even if cookie deletion fails.
      }
    }

    await signOut({ callbackUrl });
  }

  return (
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
  );
}
