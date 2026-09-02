"use client";

import { SUBJECT_PAGE_COPY } from "./subject-page/SubjectPage.constants";
import { usePillText } from "./usePillText";

/**
 * Shows or hides the words on every item pill at once.
 *
 * One control rather than one per section: the preference is about how a
 * member likes to read, not about the section they happen to be looking at,
 * so wherever it is pressed every pill on every page follows.
 */
export default function PillTextToggle({ className = "" }: { className?: string }) {
  const [showText, setShowText] = usePillText();
  return (
    <button
      type="button"
      aria-pressed={showText}
      onClick={() => setShowText(!showText)}
      className={`inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${
        showText ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/60 hover:bg-surface-muted"
      } ${className}`.trim()}
    >
      {showText ? SUBJECT_PAGE_COPY.pillTextOn : SUBJECT_PAGE_COPY.pillTextOff}
    </button>
  );
}
