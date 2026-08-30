"use client";

import { useCallback, useEffect, useState } from "react";

import {
  GAME_BOARD_REGIONS,
  GAME_CORNER_COUNT,
  GAME_CORNER_KEYS,
  gameRegionCoversCorner,
  type GameBoardRegion,
  type GameQuestionPayload,
} from "@/lib/gameMode";
import GameChoiceTile from "./GameChoiceTile";
import { GAME_BOARD_FLASH_MS, GAME_COPY, GAME_CORNER_PLACEHOLDER_CLASS } from "./GameMode.constants";
import { useGameAnswerKeys } from "./useGameAnswerKeys";

type Props = {
  question: GameQuestionPayload;
  isChain: boolean;
  /** Read puts text on the tiles; Find puts glyphs there. */
  isTextAnswer: boolean;
  answering: boolean;
  feedback: { subjectId: number; correct: boolean } | null;
  inputBlocked: boolean;
  clockUrgent: boolean;
  onAnswer: (subjectId: number) => void;
};

const CORNER_SLOTS = Array.from({ length: GAME_CORNER_COUNT }, (_, index) => index);

/**
 * The board every tile game is played on.
 *
 * Four corners around the word, always in the same places, whether the round
 * lights up two, three or four of them. The corners that are not in play stay
 * visible as placeholders so the board never rearranges itself under the player
 * mid-run, and the keys are the numpad corners that sit where the tiles do.
 */
export default function GameCornersBoard({
  question,
  isChain,
  isTextAnswer,
  answering,
  feedback,
  inputBlocked,
  clockUrgent,
  onAnswer,
}: Props) {
  const [flash, setFlash] = useState<{ region: GameBoardRegion; at: number } | null>(null);

  const onInertKey = useCallback((region: GameBoardRegion) => {
    setFlash({ region, at: performance.now() });
  }, []);

  useGameAnswerKeys({
    options: question.options,
    disabled: answering || Boolean(feedback) || inputBlocked,
    onAnswer,
    onInertKey,
  });

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), GAME_BOARD_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const corner = (index: number) => {
    const option = question.options[index];
    const lit = flash !== null && gameRegionCoversCorner(flash.region, index);
    const keyHint = GAME_CORNER_KEYS[index]!;
    if (!option) {
      return (
        <div
          key={`empty-${index}`}
          aria-hidden="true"
          className={`${GAME_CORNER_PLACEHOLDER_CLASS} ${lit ? "ring-4 ring-foreground/25" : ""}`}
        >
          <span className="text-lg font-black text-foreground/25 sm:text-2xl">{keyHint}</span>
        </div>
      );
    }
    return (
      <GameChoiceTile
        key={option.subjectId}
        option={option}
        keyHint={keyHint}
        dense
        isTextAnswer={isTextAnswer}
        flash={lit}
        disabled={answering}
        feedback={feedback?.subjectId === option.subjectId ? feedback : null}
        onSelect={() => onAnswer(option.subjectId)}
      />
    );
  };

  const promptLit = flash?.region === GAME_BOARD_REGIONS.center;

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:mt-4 sm:gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
        {CORNER_SLOTS.slice(0, 2).map(corner)}
      </div>
      <div
        className={`flex shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-3 text-center transition sm:px-5 sm:py-4 ${
          clockUrgent ? "border-red-500 bg-red-50" : "border-line bg-surface-muted"
        } ${promptLit ? "ring-4 ring-foreground/25" : ""}`}
      >
        <p className="text-[10px] font-bold uppercase text-foreground/60">
          {isChain
            ? GAME_COPY.chooseChain
            : `${isTextAnswer ? GAME_COPY.chooseAnswer : GAME_COPY.chooseMatch} · ${question.answerType}`}
        </p>
        <p className={`mt-1 font-black text-foreground ${
          isChain || isTextAnswer
            ? "text-4xl [font-family:var(--font-jp-current)] sm:text-6xl"
            : "text-2xl sm:text-4xl"
        }`}>
          {question.prompt}
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
        {CORNER_SLOTS.slice(2).map(corner)}
      </div>
    </div>
  );
}
