import { useEffect, useState } from "react";

import { lockBodyScroll } from "@/lib/bodyScrollLock";
import { formatGameDuration, type GameQuestionPayload } from "@/lib/gameMode";
import { GAME_COPY } from "./GameMode.constants";

type Props = {
  question: GameQuestionPayload;
  questionIndex: number;
  questionTotal: number;
  correctCount: number;
  elapsedMs: number;
  answering: boolean;
  feedback: { subjectId: number; correct: boolean } | null;
  error: string | null;
  onAnswer: (subjectId: number) => void;
  onExit: () => void;
};

function choiceTone(subjectType: string): string {
  if (subjectType === "radical") return "border-radical/60 bg-radical/15 text-radical";
  if (subjectType === "kanji") return "border-kanji/60 bg-kanji/15 text-kanji";
  return "border-vocabulary/60 bg-vocabulary/15 text-vocabulary";
}

export default function GameRunner({
  question,
  questionIndex,
  questionTotal,
  correctCount,
  elapsedMs,
  answering,
  feedback,
  error,
  onAnswer,
  onExit,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => lockBodyScroll(), []);

  return (
    <div className="fixed inset-0 z-100 bg-background p-2 sm:p-5">
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col">
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase text-foreground/60 sm:pb-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={onExit} className="h-9 rounded-full border border-line bg-surface px-3 text-xs font-black text-foreground hover:bg-surface-muted">Exit</button>
            <span className="truncate">{questionIndex + 1}/{questionTotal}</span>
          </div>
          <span className="hidden whitespace-nowrap sm:inline">{correctCount} {GAME_COPY.correct}</span>
          <span className="hidden text-right sm:inline">{formatGameDuration(elapsedMs)}</span>
          <button type="button" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen} aria-label="Game details" className="justify-self-end h-9 w-9 rounded-full border border-line bg-surface text-base font-black text-foreground hover:bg-surface-muted sm:hidden">...</button>
          {detailsOpen ? (
            <div className="absolute right-0 top-full z-40 mt-2 flex rounded-xl border border-line bg-surface p-2 shadow-[0_14px_30px_rgba(8,16,36,0.18)] sm:hidden">
              <span className="whitespace-nowrap px-3 py-1">{correctCount} {GAME_COPY.correct}</span>
              <span className="whitespace-nowrap border-l border-line px-3 py-1">{formatGameDuration(elapsedMs)}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-2 grid h-80 min-h-80 shrink-0 grid-cols-2 gap-2 sm:mt-4 sm:gap-5">
          {question.options.map((option) => {
            const selectedFeedback = feedback?.subjectId === option.subjectId ? feedback : null;
            return (
              <button
                key={option.subjectId}
                type="button"
                disabled={answering}
                onClick={() => onAnswer(option.subjectId)}
                className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-2xl border p-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:cursor-wait sm:p-5 ${choiceTone(option.subjectType)} ${selectedFeedback ? (selectedFeedback.correct ? "ring-8 ring-emerald-500 bg-emerald-100" : "ring-8 ring-red-500 bg-red-100") : "hover:brightness-95"}`}
              >
                <span className="absolute right-2 top-2 rounded-full border border-line bg-surface/90 px-2 py-1 text-[10px] font-bold text-foreground sm:right-4 sm:top-4 sm:text-xs">L{option.level}</span>
                <span className="break-all text-center text-5xl font-black leading-none [font-family:var(--font-jp-current)] sm:text-9xl">{option.characters}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted px-3 py-3 text-center sm:mt-4 sm:px-5 sm:py-4">
          <p className="text-[10px] font-bold uppercase text-foreground/60">{GAME_COPY.chooseMatch} · {question.answerType}</p>
          <p className="mt-1 text-2xl font-black text-foreground sm:text-4xl">{question.prompt}</p>
        </div>
        {error ? <p className="mt-2 shrink-0 text-center text-sm font-bold text-red-700">{error}</p> : null}
      </main>
    </div>
  );
}
