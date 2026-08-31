"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { gameKindRules, type GameQuestionPayload, type GameRunSummary } from "@/lib/gameMode";
import { GAME_COPY } from "./GameMode.constants";
import type { ActiveGame, GameSelection } from "./GameMode.types";

const ANSWER_FLASH_MS = 250;
const TIMER_TICK_MS = 100;

type Feedback = { subjectId: number; correct: boolean };

export function useGameSession({
  accountId,
  onStarted,
  onCompleted,
}: {
  accountId: string;
  onStarted: () => void;
  onCompleted: () => void;
}) {
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [starting, setStarting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const finishingRef = useRef(false);

  const isRunning = activeGame?.run.status === "active";
  const timeLimitMs = activeGame?.run.timeLimitMs ?? null;

  useEffect(() => {
    if (!isRunning || !activeGame) return;
    const startedAtMs = new Date(activeGame.run.startedAt).getTime();
    setElapsedMs(Date.now() - startedAtMs);
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtMs), TIMER_TICK_MS);
    return () => window.clearInterval(timer);
  }, [activeGame, isRunning]);

  const finishRun = useCallback(async () => {
    if (!activeGame || finishingRef.current) return;
    finishingRef.current = true;
    try {
      const response = await fetch(`/api/game/${accountId}/runs/${activeGame.run.id}/complete`, { method: "POST" });
      const payload = (await response.json()) as { run?: GameRunSummary; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? "Could not finish the game.");
      setActiveGame((current) => (current ? { ...current, run: payload.run! } : current));
      onCompleted();
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Could not finish the game.");
    } finally {
      finishingRef.current = false;
    }
  }, [accountId, activeGame, onCompleted]);

  // A timed run closes on the clock even when the player stops answering.
  useEffect(() => {
    if (!isRunning || timeLimitMs === null || elapsedMs < timeLimitMs) return;
    void finishRun();
  }, [elapsedMs, finishRun, isRunning, timeLimitMs]);

  const startGame = useCallback(async (selection: GameSelection) => {
    setStarting(true);
    setError(null);
    finishingRef.current = false;
    try {
      const rules = gameKindRules(selection.kind);
      const response = await fetch(`/api/game/${accountId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: selection.kind,
          batchSize: selection.batchSize,
          level: selection.level,
          category: selection.category,
          choiceCount: selection.choiceCount,
          direction: selection.direction,
          answerMode: selection.answerMode,
          practiceList: selection.practiceList,
          // Every game keeps its own settings; a leftover Ultra or time limit
          // from another game must not travel with this one.
          ultraMode: rules.usesUltraMode && selection.ultraMode,
          timeLimitMs: rules.usesTimeLimit ? selection.timeLimitMs : null,
          // Same rule: a country chosen for Map must not ride along elsewhere.
          mapCountry: rules.usesMapCountry ? selection.mapCountry ?? "JP" : undefined,
        }),
      });
      const payload = (await response.json()) as ActiveGame & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not start the game.");
      setActiveGame({ run: payload.run, questions: payload.questions });
      // A resumed Daily attempt already has answers recorded.
      setQuestionIndex(payload.run.answeredCount);
      setFeedback(null);
      setElapsedMs(0);
      onStarted();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start the game.");
    } finally {
      setStarting(false);
    }
  }, [accountId, onStarted]);

  const answerQuestion = useCallback(async (question: GameQuestionPayload, selectedSubjectId: number) => {
    if (!activeGame || answering || feedback) return;
    setAnswering(true);
    setError(null);
    try {
      const response = await fetch(`/api/game/${accountId}/runs/${activeGame.run.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, selectedSubjectId }),
      });
      const payload = (await response.json()) as {
        correct?: boolean;
        expired?: boolean;
        run?: GameRunSummary;
        appendedQuestions?: GameQuestionPayload[];
        error?: string;
      };
      if (!response.ok || typeof payload.correct !== "boolean" || !payload.run) {
        throw new Error(payload.error ?? "Could not record the answer.");
      }
      const run = payload.run;
      setFeedback({ subjectId: selectedSubjectId, correct: payload.correct });
      setActiveGame((current) => current
        ? { ...current, run, questions: [...current.questions, ...(payload.appendedQuestions ?? [])] }
        : current);
      window.setTimeout(() => {
        if (run.status === "completed") {
          onCompleted();
        } else {
          setQuestionIndex((value) => value + 1);
        }
        setFeedback(null);
        setAnswering(false);
      }, ANSWER_FLASH_MS);
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "Could not record the answer.");
      setAnswering(false);
    }
  }, [accountId, activeGame, answering, feedback, onCompleted]);

  const reset = useCallback(() => {
    setActiveGame(null);
    setQuestionIndex(0);
    setFeedback(null);
    setError(null);
    setElapsedMs(0);
    finishingRef.current = false;
  }, []);

  return {
    activeGame,
    questionIndex,
    currentQuestion: activeGame?.questions[questionIndex] ?? null,
    feedback,
    starting,
    answering,
    error,
    elapsedMs,
    remainingMs: timeLimitMs === null ? null : Math.max(0, timeLimitMs - elapsedMs),
    loadErrorCopy: GAME_COPY.loadError,
    startGame,
    answerQuestion,
    finishRun,
    reset,
    setError,
  };
}
