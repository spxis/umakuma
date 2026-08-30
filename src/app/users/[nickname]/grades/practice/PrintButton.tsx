"use client";

import { PRACTICE_SHEET_COPY } from "./practiceCopy";

/** Opens the browser's own print dialog; the page is already styled for paper. */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center rounded-full bg-neutral-900 px-5 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-neutral-700"
    >
      {PRACTICE_SHEET_COPY.print}
    </button>
  );
}
