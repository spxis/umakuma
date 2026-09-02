"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import { STUDY_LIST_COPY } from "./studyListCopy";

/**
 * Sign out, from the menu, at once.
 *
 * Pressing Sign out used to open a page offering Logout and Join as tabs and
 * Cancel beside the button, so a member who had asked to leave was still
 * signed in and could not tell from looking. Asking to sign out from your own
 * menu is deliberate enough; this does it and lands on the home page.
 *
 * A button rather than a link on purpose: a link to a page that signs you out
 * would be prefetched on hover, and hovering a menu must not end a session.
 */
export default function SignOutMenuItem({ className }: { className: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOut({ callbackUrl: "/" }).catch(() => setBusy(false));
      }}
      className={className}
    >
      {busy ? STUDY_LIST_COPY.signingOut : STUDY_LIST_COPY.signOut}
    </button>
  );
}
