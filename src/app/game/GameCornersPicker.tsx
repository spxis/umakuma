"use client";

import { GAME_CORNER_COUNT, GAME_CORNER_KEYS, type GameChoiceCount } from "@/lib/gameMode";
import { GAME_COPY, GAME_CORNER_PLACEHOLDER_CLASS } from "./GameMode.constants";

type Props = {
  choiceCount: GameChoiceCount;
  /** Tailwind classes for a corner that is in play, taken from the game's accent. */
  accentClass: string;
  onChange: (choiceCount: GameChoiceCount) => void;
};

const CORNER_SLOTS = Array.from({ length: GAME_CORNER_COUNT }, (_, index) => index);
/** The top two corners are the game; the bottom two are the player's to add. */
const FIXED_CORNERS = 2;

/**
 * The board, before the round starts.
 *
 * The player sees the same four corners they will play on and adds the bottom
 * two by pressing the `+` sitting over them, so a three- or four-corner round
 * never rearranges anything they had already learned to look at.
 */
export default function GameCornersPicker({ choiceCount, accentClass, onChange }: Props) {
  const corner = (index: number) => {
    const keyHint = GAME_CORNER_KEYS[index]!;
    const live = index < choiceCount;
    if (index < FIXED_CORNERS) {
      return (
        <div key={keyHint} className={`flex items-center justify-center rounded-xl border text-sm font-black ${accentClass}`}>
          {keyHint}
        </div>
      );
    }

    // Adding the fourth corner brings the third with it; dropping the third
    // drops the fourth, so the count is never a gap in the board.
    const nextCount = (live ? index : index + 1) as GameChoiceCount;
    return (
      <button
        key={keyHint}
        type="button"
        onClick={() => onChange(nextCount)}
        aria-pressed={live}
        aria-label={live ? GAME_COPY.removeCorner : GAME_COPY.addCorner}
        className={`flex items-center justify-center rounded-xl border text-sm font-black transition hover:brightness-95 ${
          live ? accentClass : `${GAME_CORNER_PLACEHOLDER_CLASS} text-foreground/45`
        }`}
      >
        <span aria-hidden="true">{live ? `${keyHint} −` : "+"}</span>
      </button>
    );
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase text-foreground/60">{GAME_COPY.corners}</p>
      <div className="mt-2 grid h-28 grid-rows-[1fr_auto_1fr] gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
        <div className="grid grid-cols-2 gap-1.5">{CORNER_SLOTS.slice(0, FIXED_CORNERS).map(corner)}</div>
        <p className="text-center text-[10px] font-black uppercase text-foreground/45">{choiceCount} {GAME_COPY.corners}</p>
        <div className="grid grid-cols-2 gap-1.5">{CORNER_SLOTS.slice(FIXED_CORNERS).map(corner)}</div>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-foreground/55">{GAME_COPY.cornersHint}</p>
    </div>
  );
}
