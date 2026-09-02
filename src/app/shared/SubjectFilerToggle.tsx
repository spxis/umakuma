"use client";

import type { MouseEvent } from "react";

import { SUBJECT_FILER_COPY } from "./studyListCopy";

/**
 * Opens and closes the filing column beside a list of results.
 *
 * A label-sized button rather than a control bar: closed, it is one quiet
 * phrase at the edge of the list, which is the most it should be for the
 * many searches that are only looking something up.
 */
export default function SubjectFilerToggle({
  open,
  onToggle,
  error,
}: {
  open: boolean;
  onToggle: () => void;
  error?: string | null;
}) {
  function halt(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <span className="flex items-center gap-2" onMouseDown={halt}>
      {error ? <span className="text-[10px] font-semibold text-rose-600">{error}</span> : null}
      <button
        type="button"
        onClick={(event) => {
          halt(event);
          onToggle();
        }}
        aria-pressed={open}
        className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${
          open ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/60 hover:bg-surface-muted"
        }`}
      >
        {open ? SUBJECT_FILER_COPY.close : SUBJECT_FILER_COPY.open}
      </button>
    </span>
  );
}
