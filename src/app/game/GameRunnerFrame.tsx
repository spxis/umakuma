import { useEffect, useState, type ReactNode } from "react";

import { lockBodyScroll } from "@/lib/bodyScrollLock";
import { GAME_KINDS, formatGameDuration, type GameKind } from "@/lib/gameMode";
import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { GAME_COPY, GAME_KIND_LABELS } from "./GameMode.constants";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";

type Props = {
  questionIndex: number;
  questionTotal: number;
  kind: GameKind;
  endless: boolean;
  correctCount: number;
  elapsedMs: number;
  remainingMs: number | null;
  error: string | null;
  onExit: () => void;
  /**
   * `inputBlocked` is true while the exit dialog owns the keyboard, and
   * `clockUrgent` while a timed run is nearly out of time, so the board can
   * carry the same warning as the clock.
   */
  children: (state: { inputBlocked: boolean; clockUrgent: boolean }) => ReactNode;
};

const URGENT_REMAINING_MS = 10_000;

/**
 * The shell every game round is played inside: progress, score, the clock and
 * the way out. Only the board between them changes from game to game.
 */
export default function GameRunnerFrame({
  questionIndex,
  questionTotal,
  kind,
  endless,
  correctCount,
  elapsedMs,
  remainingMs,
  error,
  onExit,
  children,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  useEffect(() => lockBodyScroll(), []);

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

  const countLabel = kind === GAME_KINDS.shiritori ? GAME_COPY.chainLength.toLowerCase() : GAME_COPY.correct;
  const isTimed = remainingMs !== null;
  const clockValue = formatGameDuration(isTimed ? remainingMs : elapsedMs);
  const clockUrgent = isTimed && remainingMs <= URGENT_REMAINING_MS;

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

        {children({ inputBlocked: exitConfirmOpen, clockUrgent })}

        {error ? <p className="mt-2 shrink-0 text-center text-sm font-bold text-red-700">{error}</p> : null}
      </main>
      <ConfirmDialog
        open={exitConfirmOpen}
        title="Leave this round?"
        description="Your answers and time for this round will be lost."
        confirmLabel="Leave round"
        layer={MODAL_LAYERS.gameAlert}
        onConfirm={onExit}
        onCancel={() => setExitConfirmOpen(false)}
      />
    </div>
  );
}
