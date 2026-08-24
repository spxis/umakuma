"use client";

import Link from "next/link";
import { useState } from "react";

type InviteSessionActionsProps = {
  buttonClassName: string;
};

export default function InviteSessionActions({ buttonClassName }: InviteSessionActionsProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function signOutInviteSession() {
    setSigningOut(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/invite/session", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Invite sign-out failed.");
      }

      window.location.href = "/invite";
    } catch {
      setSigningOut(false);
      setErrorMessage("Could not sign out. Try again.");
    }
  }

  return (
    <>
      <Link href="/invite" className={buttonClassName}>
        Manage invite
      </Link>
      <button
        type="button"
        onClick={() => {
          void signOutInviteSession();
        }}
        disabled={signingOut}
        className={`${buttonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-center text-xs font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}