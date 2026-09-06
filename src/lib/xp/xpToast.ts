/**
 * Telling a member they just earned something, wherever they earned it.
 *
 * Duolingo's shape, which John asked for: the award drops in from the top,
 * says what it was, and goes away on its own. Two things follow from "goes
 * away on its own" that are easy to get wrong.
 *
 * **It must stack.** A single review can pay twice - the answer and the
 * correct answer - and a burn or a level-up lands on top of that. One slot
 * would show the last one only, or flicker between them, and a member would
 * see nothing at exactly the moment there was most to see.
 *
 * **It must not be the record.** A toast is a courtesy; the XP page is the
 * ledger. So nothing here is persisted, nothing is retried, and a missed one
 * is not a bug worth waking anybody for.
 *
 * An event rather than a prop, because the surfaces that pay XP - the review
 * modal, a finished game, a level test, a lesson - have no parent in common
 * short of the layout, and threading a callback through all of them is how the
 * cue ends up drawn four slightly different ways.
 */

export const XP_TOAST_EVENT = "umakuma:xp-toast";

/** How long one stays before it fades. Long enough to read, short enough to ignore. */
export const XP_TOAST_MS = 2600;

/** At most this many at once; older ones go first. */
export const XP_TOAST_MAX = 3;

export type XpToast = {
  /** Unique per toast, so React can key them and a timer can find its own. */
  id: string;
  /** The XP paid. Always positive: nothing here reports a loss. */
  xp: number;
  /** What earned it, in the member's words. Absent for a bare award. */
  reason?: string;
};

export type XpToastRequest = Omit<XpToast, "id">;

/**
 * Raise one.
 *
 * Silent on the server and in a test without a DOM, because a caller paying
 * XP should not have to know whether anything is listening.
 */
export function showXpToast(request: XpToastRequest): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(request.xp) || request.xp <= 0) return;
  window.dispatchEvent(new CustomEvent<XpToastRequest>(XP_TOAST_EVENT, { detail: request }));
}

/** What a toast says. Kept here so the locale layer has one place to look. */
export const XP_TOAST_COPY = {
  amount: (xp: number) => `+${xp} XP`,
  label: "Experience earned",
} as const;

/**
 * The stack after one arrives.
 *
 * Pure, so the trimming rule is testable without a browser: the newest is kept
 * and the oldest falls off, because the one a member has not read yet is the
 * one that just landed.
 */
export function withXpToast(held: readonly XpToast[], next: XpToast): XpToast[] {
  return [...held, next].slice(-XP_TOAST_MAX);
}
