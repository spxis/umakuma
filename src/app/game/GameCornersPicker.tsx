"use client";

import { GAME_CORNER_COUNT, GAME_CORNER_KEYS, type GameChoiceCount } from "@/lib/gameMode";
import { GAME_COPY, GAME_CORNER_PLACEHOLDER_CLASS } from "./GameMode.constants";

type Props = {
  choiceCount: GameChoiceCount;
  /** Tailwind classes for a corner that is in play, taken from the game's accent. */
  accentClass: string;
  labelClass: string;
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
 *
 * Sized to sit in the same grid row as the select fields: the live count moved
 * into the label and the explanatory line became a tooltip, which took the
 * control from three stacked bands down to one.
 */
export default function GameCornersPicker({ choiceCount, accentClass, labelClass, onChange }: Props) {
  const corner = (index: number) => {
    const keyHint = GAME_CORNER_KEYS[index]!;
    const live = index < choiceCount;
    if (index < FIXED_CORNERS) {
      return (
        <div
          key={keyHint}
          className={`flex items-center justify-center rounded border text-[11px] font-black leading-none ${accentClass}`}
        >
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
        className={`flex items-center justify-center rounded border text-[11px] font-black leading-none transition hover:brightness-95 ${
          live ? accentClass : `${GAME_CORNER_PLACEHOLDER_CLASS} text-foreground/60`
        }`}
      >
        <span aria-hidden="true">{live ? `${keyHint} −` : "+"}</span>
      </button>
    );
  };

  return (
    <div title={GAME_COPY.cornersHint}>
      <span className={labelClass}>
        {GAME_COPY.corners} · {choiceCount}
      </span>
      <div className="grid h-[3.4rem] grid-cols-2 grid-rows-2 gap-1 rounded-lg border border-line bg-surface p-1">
        {CORNER_SLOTS.map(corner)}
      </div>
    </div>
  );
}
