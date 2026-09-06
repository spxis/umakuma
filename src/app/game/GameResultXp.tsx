import Link from "next/link";

import type { GameRunSummary } from "@/lib/gameMode";

import { GAME_COPY } from "./GameMode.constants";

/**
 * What this game paid, said on the game's own results panel.
 *
 * The toasts say it as it happens and go away on their own; this is the line
 * that is still there when a player looks up. Both matter, but only one of
 * them can say that a game paid *nothing* — a toast refuses a zero by design,
 * which is how the third and fourth games of a day came to be silent. John
 * played four, earned ten XP for two of them, and had no way to tell the
 * difference between a rule and a bug.
 *
 * Read off the run rather than off the response, so it survives a reload and
 * says the same thing on a history page later. `xpSkipped` holds a code; the
 * sentence is in `GAME_COPY` with the rest of the game's words.
 */
export default function GameResultXp({ run }: { run: GameRunSummary }) {
  const reason = run.xpSkipped ? GAME_COPY.xpSkipReasons[run.xpSkipped] : null;

  /* Nothing earned and no reason recorded is a run from before any of this was
     written down. Saying "no XP" about it would be a guess. */
  if (run.xpAwarded <= 0 && !reason) return null;

  return (
    <p className="mt-5 text-sm font-bold text-foreground/70">
      {run.xpAwarded > 0 ? (
        <span className="text-foreground">{GAME_COPY.xpEarned(run.xpAwarded)}</span>
      ) : (
        <span>{GAME_COPY.xpNone}</span>
      )}
      {reason ? <span className="font-semibold text-foreground/60"> {reason}</span> : null}{" "}
      <Link href="/xp/earn" className="font-black text-foreground/70 underline hover:text-accent">
        {GAME_COPY.xpHowItWorks}
      </Link>
    </p>
  );
}
