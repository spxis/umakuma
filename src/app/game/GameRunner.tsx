import { useEffect, useState } from "react";

import { lockBodyScroll } from "@/lib/bodyScrollLock";
import {
  GAME_KINDS,
  formatGameDuration,
  gameOptionIndexForKey,
  type GameKind,
  type GameOptionTile,
  type GameQuestionPayload,
} from "@/lib/gameMode";
import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { GAME_COPY, GAME_KIND_LABELS } from "./GameMode.constants";

type Props = {
  question: GameQuestionPayload;
  questionIndex: number;
  questionTotal: number;
  kind: GameKind;
  endless: boolean;
  correctCount: number;
  elapsedMs: number;
  remainingMs: number | null;
  answering: boolean;
  feedback: { subjectId: number; correct: boolean } | null;
  error: string | null;
  onAnswer: (subjectId: number) => void;
  onExit: () => void;
};

const URGENT_REMAINING_MS = 10_000;
const CHAIN_ANSWER_TYPE = "chain";

function choiceTone(subjectType: string): string {
  if (subjectType === "radical") return "border-radical/60 bg-radical/15 text-radical";
  if (subjectType === "kanji") return "border-kanji/60 bg-kanji/15 text-kanji";
  return "border-vocabulary/60 bg-vocabulary/15 text-vocabulary";
}

export default function GameRunner({
  question,
  questionIndex,
  questionTotal,
  kind,
  endless,
  correctCount,
  elapsedMs,
  remainingMs,
  answering,
  feedback,
  error,
  onAnswer,
  onExit,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  useEffect(() => lockBodyScroll(), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || answering || feedback || exitConfirmOpen) {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      const optionIndex = gameOptionIndexForKey(event.key, question.options.length);
      if (optionIndex === null) return;

      event.preventDefault();
      const option = question.options[optionIndex];
      if (option) onAnswer(option.subjectId);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answering, exitConfirmOpen, feedback, onAnswer, question.options]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !exitConfirmOpen) {
        event.preventDefault();
        setExitConfirmOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitConfirmOpen]);

  const optionCount = question.options.length;
  const isQuad = optionCount === 4;
  const isChain = question.answerType === CHAIN_ANSWER_TYPE;
  // In Read mode the tiles carry text and the prompt carries the glyph.
  const isTextAnswer = question.options.some((option) => option.label !== option.characters);
  const countLabel = kind === GAME_KINDS.shiritori ? GAME_COPY.chainLength.toLowerCase() : GAME_COPY.correct;
  const isTimed = remainingMs !== null;
  const clockValue = formatGameDuration(isTimed ? remainingMs : elapsedMs);
  const clockUrgent = isTimed && remainingMs <= URGENT_REMAINING_MS;

  function tile(option: GameOptionTile, keyHint: string) {
    const selectedFeedback = feedback?.subjectId === option.subjectId ? feedback : null;
    return (
      <button
        key={option.subjectId}
        type="button"
        disabled={answering}
        onClick={() => onAnswer(option.subjectId)}
        className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-2xl border p-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:cursor-wait sm:p-5 ${choiceTone(option.subjectType)} ${selectedFeedback ? (selectedFeedback.correct ? "ring-8 ring-emerald-500 bg-emerald-100" : "ring-8 ring-red-500 bg-red-100") : "hover:brightness-95"}`}
      >
        <span aria-hidden="true" className="absolute left-2 top-2 text-lg font-black text-foreground/50 sm:left-4 sm:top-4">{keyHint}</span>
        <span className="absolute right-2 top-2 rounded-full border border-line bg-surface/90 px-2 py-1 text-[10px] font-bold text-foreground sm:right-4 sm:top-4 sm:text-xs">L{option.level}</span>
        <span className={`text-center font-black leading-tight ${
          isTextAnswer
            ? `break-words ${optionCount >= 3 ? "text-xl sm:text-3xl" : "text-2xl sm:text-5xl"}`
            : `break-all [font-family:var(--font-jp-current)] leading-none ${optionCount >= 3 ? "text-4xl sm:text-6xl" : "text-5xl sm:text-9xl"}`
        }`}>
          {option.label}
        </span>
      </button>
    );
  }

  const rowHint = (index: number) => (index === 0 ? "←" : index === optionCount - 1 ? "→" : "↑");

  const prompt = (
    <div className={`flex flex-1 flex-col items-center justify-center rounded-xl border px-3 py-3 text-center sm:px-5 sm:py-4 ${clockUrgent ? "border-red-500 bg-red-50" : "border-line bg-surface-muted"}`}>
      <p className="text-[10px] font-bold uppercase text-foreground/60">
        {isChain ? GAME_COPY.chooseChain : isTextAnswer ? `${GAME_COPY.chooseAnswer} · ${question.answerType}` : `${GAME_COPY.chooseMatch} · ${question.answerType}`}
      </p>
      <p className={`mt-1 font-black text-foreground ${
        isChain || isTextAnswer
          ? "text-4xl [font-family:var(--font-jp-current)] sm:text-6xl"
          : "text-2xl sm:text-4xl"
      }`}>
        {question.prompt}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-100 bg-background p-2 sm:p-5">
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col">
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase text-foreground/60 sm:pb-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setExitConfirmOpen(true)} className="h-9 rounded-full border border-line bg-surface px-3 text-xs font-black text-foreground hover:bg-surface-muted">Exit</button>
            <span className="truncate">{questionIndex + 1}/{endless ? "∞" : questionTotal}</span>
            <span className="hidden truncate text-foreground/45 lg:inline">{GAME_KIND_LABELS[kind]}</span>
          </div>
          <span className="hidden whitespace-nowrap sm:inline">{correctCount} {countLabel}</span>
          {/* A run against the clock leads with the clock. */}
          {isTimed ? (
            <span className={`justify-self-end text-3xl font-black leading-none tabular-nums sm:text-5xl ${clockUrgent ? "text-red-600" : "text-foreground"}`}>
              {clockValue}
            </span>
          ) : (
            <span className="hidden text-right sm:inline">{clockValue}</span>
          )}
          {!isTimed ? (
            <button type="button" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen} aria-label="Game details" className="justify-self-end h-9 w-9 rounded-full border border-line bg-surface text-base font-black text-foreground hover:bg-surface-muted sm:hidden">...</button>
          ) : null}
          {detailsOpen ? (
            <div className="absolute right-0 top-full z-40 mt-2 flex rounded-xl border border-line bg-surface p-2 shadow-[0_14px_30px_rgba(8,16,36,0.18)] sm:hidden">
              <span className="whitespace-nowrap px-3 py-1">{correctCount} {countLabel}</span>
              <span className="whitespace-nowrap border-l border-line px-3 py-1">{clockValue}</span>
            </div>
          ) : null}
        </div>

        {isQuad ? (
          /* Two above, two below, and the word they are answering in between. */
          <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:mt-4 sm:gap-4">
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
              {question.options.slice(0, 2).map((option, index) => tile(option, String(index + 1)))}
            </div>
            <div className="shrink-0">{prompt}</div>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
              {question.options.slice(2).map((option, index) => tile(option, String(index + 3)))}
            </div>
          </div>
        ) : (
          <>
            <div className={`mt-2 grid h-80 min-h-80 shrink-0 gap-2 sm:mt-4 sm:gap-5 ${optionCount === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {question.options.map((option, index) => tile(option, rowHint(index)))}
            </div>
            <div className="mt-2 flex min-h-0 flex-1 flex-col sm:mt-4">{prompt}</div>
          </>
        )}

        {error ? <p className="mt-2 shrink-0 text-center text-sm font-bold text-red-700">{error}</p> : null}
      </main>
      <ConfirmDialog
        open={exitConfirmOpen}
        title="Leave this round?"
        description="Your answers and time for this round will be lost."
        confirmLabel="Leave round"
        overlayZIndexClass="z-110"
        onConfirm={onExit}
        onCancel={() => setExitConfirmOpen(false)}
      />
    </div>
  );
}
