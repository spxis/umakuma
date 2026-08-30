"use client";

import { useEffect } from "react";

import {
  GAME_KEY_LAYOUTS,
  gameBoardRegionForKey,
  gameOptionIndexForKey,
  type GameBoardRegion,
  type GameKeyLayout,
  type GameOptionTile,
} from "@/lib/gameMode";

/**
 * Answers the current question from the keyboard.
 *
 * Shared by every board so the keys mean the same thing whether the choices are
 * tiles of text or places on a map. `onInertKey` is how a board answers for the
 * keys that name half of itself: they cannot choose anything, so the board
 * flashes what they point at instead of ignoring the press.
 */
export function useGameAnswerKeys({
  options,
  layout = GAME_KEY_LAYOUTS.corners,
  disabled,
  onAnswer,
  onInertKey,
}: {
  options: GameOptionTile[];
  layout?: GameKeyLayout;
  disabled: boolean;
  onAnswer: (subjectId: number) => void;
  onInertKey?: (region: GameBoardRegion) => void;
}) {
  useEffect(() => {
    if (disabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      const optionIndex = gameOptionIndexForKey(event.key, options.length, layout);
      if (optionIndex === null) {
        if (!onInertKey) return;
        const region = gameBoardRegionForKey(event.key);
        if (region === null) return;
        event.preventDefault();
        onInertKey(region);
        return;
      }

      event.preventDefault();
      const option = options[optionIndex];
      if (option) onAnswer(option.subjectId);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, layout, onAnswer, onInertKey, options]);
}
