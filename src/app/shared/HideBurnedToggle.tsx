"use client";

import { STUDY_TAG_LIST_COPY } from "./studyTagListsUi";
import { useHideBurned } from "./useHideBurned";

/**
 * Apply the Burned list to what is being read.
 *
 * The count stays in view either way - "12 burned hidden" - so a list never
 * looks shorter than it is without saying why. Nothing is drawn at all when
 * the member has burned nothing, since a toggle that changes nothing is noise.
 */
export default function HideBurnedToggle({ hidden, burnedInView }: { hidden: number; burnedInView: number }) {
  const [hide, setHide] = useHideBurned();
  if (burnedInView === 0 && hidden === 0) return null;
  return (
    <button
      type="button"
      aria-pressed={hide}
      onClick={() => setHide(!hide)}
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition ${
        hide ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/60 hover:bg-surface-muted"
      }`}
    >
      {hide ? STUDY_TAG_LIST_COPY.burnedHidden(hidden) : STUDY_TAG_LIST_COPY.hideBurned(burnedInView)}
    </button>
  );
}
