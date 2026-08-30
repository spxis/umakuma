"use client";

import { useEffect } from "react";

import { gameOptionIndexForKey, type GameOptionTile } from "@/lib/gameMode";

/**
 * Answers the current question from the keyboard.
 *
 * Shared by every board so the arrow and number keys mean the same thing whether
 * the choices are tiles of text or places on a map.
 */
export function useGameAnswerKeys({
  options,
  disabled,
  onAnswer,
}: {
  options: GameOptionTile[];
  disabled: boolean;
  onAnswer: (subjectId: number) => void;
}) {
  useEffect(() => {
    if (disabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      const optionIndex = gameOptionIndexForKey(event.key, options.length);
      if (optionIndex === null) return;

      event.preventDefault();
      const option = options[optionIndex];
      if (option) onAnswer(option.subjectId);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, onAnswer, options]);
}
