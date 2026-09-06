"use client";

import { useState } from "react";

import ThemeBrowserModal from "./ThemeBrowserModal";
import { THEME_PICKER_COPY as copy } from "./themeCopy";
import type { MemberThemeState } from "./useMemberTheme";

/**
 * The one door into the theme browser.
 *
 * Two surfaces offer it — the profile card and the theme's own page — and a
 * button that opens a modal is exactly the pair that drifts when it is written
 * twice: one gets a title, the other a different word for the same thing. The
 * open state belongs with the button rather than with either page, since
 * neither has any other use for it.
 */
export default function ThemeBrowseButton({
  state,
  className = "",
}: {
  state: MemberThemeState;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={copy.browseTitle}
        className={`rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground transition hover:text-accent ${className}`.trim()}
      >
        {copy.browse}
      </button>
      {open ? <ThemeBrowserModal state={state} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
