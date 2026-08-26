"use client";

import { useEffect, useRef, useState } from "react";

import { formatGameDuration, formatGameScore, isGameBatchSize, type GameLeaderboardEntry, type GameQuestionPayload, type GameRunSummary } from "@/lib/gameMode";
import { SubjectTypePill } from "@/app/users/[nickname]/shared/ExplorerPill";
import GameLeaderboard from "./GameLeaderboard";
import GameLeaderboardFilters from "./GameLeaderboardFilters";
import GameRecentGames from "./GameRecentGames";
import GameRunner from "./GameRunner";
import { GAME_CATEGORY_LABELS, GAME_COPY, GAME_LEVEL_PILL_CLASS, GAME_MIXED_PILL_CLASS } from "./GameMode.constants";
import type {
  ActiveGame,
  GameLeaderboardResponse,
  GameLeaderboardFilters as LeaderboardFilters,
  GameModeClientProps,
  GamePhase,
  GameSelection,
  GameSetupResponse,
} from "./GameMode.types";
import { usePersistedGameSettings } from "./usePersistedGameSettings";

const ANSWER_FLASH_MS = 250;

function gameSelectionBatchSize(batchSize: number): GameSelection["batchSize"] {
  return isGameBatchSize(batchSize) ? batchSize : "all";
}

export default function GameModeClient({ accountId, nickname, wkUsername }: GameModeClientProps) {
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [setup, setSetup] = useState<GameSetupResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const { selection: [selection, setSelection], filters: [leaderboardFilters, setLeaderboardFilters] } = usePersistedGameSettings();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ subjectId: number; correct: boolean } | null>(null);
  const [starting, setStarting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [challengeRequest, setChallengeRequest] = useState(0);
  const setupRef = useRef<HTMLElement | null>(null);
  const leaderboardKey = `${leaderboardFilters.batchSize}:${leaderboardFilters.level ?? "all"}:${leaderboardFilters.mode}:${leaderboardFilters.range}:${leaderboardFilters.metric}:${leaderboardFilters.hardMode}:${leaderboardRefresh}`;
  const [leaderboardState, setLeaderboardState] = useState<{
    key: string;
    data: GameLeaderboardResponse | null;
  }>({ key: "", data: null });

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/game/${accountId}/setup`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as GameSetupResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? GAME_COPY.loadError);
        setSetup(payload);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSetupError(error instanceof Error ? error.message : GAME_COPY.loadError);
      });
    return () => controller.abort();
  }, [accountId]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      batchSize: String(leaderboardFilters.batchSize),
      level: leaderboardFilters.level === "any" ? "any" : leaderboardFilters.level === null ? "all" : String(leaderboardFilters.level),
      category: leaderboardFilters.mode,
      range: leaderboardFilters.range,
      metric: leaderboardFilters.metric,
      hardMode: leaderboardFilters.hardMode ? "hard" : "all",
    });
    void fetch(`/api/game/${accountId}/leaderboard?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as GameLeaderboardResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load scoreboard.");
        setLeaderboardState({ key: leaderboardKey, data: payload });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGameError(error instanceof Error ? error.message : "Could not load scoreboard.");
      });
    return () => controller.abort();
  }, [accountId, leaderboardFilters, leaderboardKey]);

  useEffect(() => {
    if (phase !== "playing" || !activeGame) return;
    const startedAtMs = new Date(activeGame.run.startedAt).getTime();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtMs), 100);
    return () => window.clearInterval(timer);
  }, [activeGame, phase]);

  useEffect(() => {
    if (challengeRequest === 0 || phase !== "lobby") return;
    setupRef.current?.scrollIntoView({ block: "center" });
  }, [challengeRequest, phase]);

  const availableCount = setup
    ? selection.level === null
      ? setup.totalCounts[selection.category]
      : setup.countsByLevel[selection.level]?.[selection.category] ?? 0
    : 0;
  const minimumItems = selection.hardMode ? 3 : 2;
  const canStart = Boolean(setup && availableCount >= (selection.batchSize === "all" ? minimumItems : selection.batchSize) && !starting);
  const currentQuestion = activeGame?.questions[questionIndex] ?? null;
  const finishedRun = phase === "results" ? activeGame?.run ?? null : null;

  async function startGame(gameSelection: GameSelection = selection) {
    const gameAvailableCount = setup
      ? gameSelection.level === null
        ? setup.totalCounts[gameSelection.category]
        : setup.countsByLevel[gameSelection.level]?.[gameSelection.category] ?? 0
      : 0;
    const gameMinimumItems = gameSelection.hardMode ? 3 : 2;
    if (!setup || gameAvailableCount < (gameSelection.batchSize === "all" ? gameMinimumItems : gameSelection.batchSize) || starting) return;
    setStarting(true);
    setGameError(null);
    try {
      const response = await fetch(`/api/game/${accountId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSize: gameSelection.batchSize,
          level: gameSelection.level,
          category: gameSelection.category,
          hardMode: gameSelection.hardMode,
        }),
      });
      const payload = (await response.json()) as ActiveGame & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not start the game.");
      setActiveGame(payload);
      setQuestionIndex(0);
      setFeedback(null);
      setElapsedMs(0);
      setPhase("playing");
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "Could not start the game.");
    } finally {
      setStarting(false);
    }
  }

  async function answerQuestion(question: GameQuestionPayload, selectedSubjectId: number) {
    if (!activeGame || answering || feedback) return;
    setAnswering(true);
    setGameError(null);
    try {
      const response = await fetch(`/api/game/${accountId}/runs/${activeGame.run.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, selectedSubjectId }),
      });
      const payload = (await response.json()) as { correct?: boolean; run?: GameRunSummary; error?: string };
      if (!response.ok || typeof payload.correct !== "boolean" || !payload.run) {
        throw new Error(payload.error ?? "Could not record the answer.");
      }
      setFeedback({ subjectId: selectedSubjectId, correct: payload.correct });
      setActiveGame((current) => current ? { ...current, run: payload.run! } : current);
      window.setTimeout(() => {
        if (payload.run?.status === "completed") {
          setPhase("results");
          setLeaderboardRefresh((value) => value + 1);
        } else {
          setQuestionIndex((value) => value + 1);
        }
        setFeedback(null);
        setAnswering(false);
      }, ANSWER_FLASH_MS);
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "Could not record the answer.");
      setAnswering(false);
    }
  }

  function resetToLobby() {
    setPhase("lobby");
    setActiveGame(null);
    setQuestionIndex(0);
    setFeedback(null);
    setGameError(null);
  }

  function challengeRecentRun(entry: GameLeaderboardEntry) {
    setSelection({ batchSize: gameSelectionBatchSize(entry.batchSize), level: entry.level, category: entry.category, hardMode: entry.hardMode });
    resetToLobby();
    setChallengeRequest((request) => request + 1);
  }

  if (!setup && !setupError) {
    return <p className="py-24 text-center text-sm font-bold text-foreground/65">{GAME_COPY.loading}</p>;
  }
  if (setupError) {
    return <p className="py-24 text-center text-sm font-bold text-red-700">{setupError}</p>;
  }

  if (phase === "playing" && currentQuestion && activeGame) {
    return (
      <GameRunner
        question={currentQuestion}
        questionIndex={questionIndex}
        questionTotal={activeGame.questions.length}
        correctCount={activeGame.run.correctCount}
        elapsedMs={elapsedMs}
        answering={answering}
        feedback={feedback}
        error={gameError}
        onAnswer={(subjectId) => void answerQuestion(currentQuestion, subjectId)}
        onExit={resetToLobby}
      />
    );
  }

  return (
    <div className="w-full pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line py-5 sm:py-7">
        <div>
          <p className="text-xs font-black uppercase text-hot">@{wkUsername}</p>
          <h1 className="mt-1 text-4xl font-black text-foreground sm:text-6xl">{GAME_COPY.title}</h1>
          <p className="mt-2 text-sm font-semibold text-foreground/65">{GAME_COPY.subtitle}</p>
        </div>
      </header>

      <main className="space-y-5 py-5 sm:py-7">
          {phase === "results" && finishedRun ? (
            <section className="border-y border-line bg-surface-muted px-4 py-8 text-center sm:py-12">
              <p className="text-xs font-black uppercase text-hot">{GAME_COPY.complete}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-black text-foreground/65">
                <span className={GAME_LEVEL_PILL_CLASS}>{finishedRun.level === null ? "All levels" : `L${finishedRun.level}`}</span>
                {finishedRun.category === "mixed" ? (
                  <span className={GAME_MIXED_PILL_CLASS}>Mixed</span>
                ) : (
                  <SubjectTypePill type={finishedRun.category}>{GAME_CATEGORY_LABELS[finishedRun.category]}</SubjectTypePill>
                )}
                <span>{finishedRun.questionCount} questions</span>
                <span>{finishedRun.hardMode ? GAME_COPY.hardMode : GAME_COPY.regularMode}</span>
              </div>
              <p className="mt-3 text-7xl font-black leading-none text-accent sm:text-9xl">{formatGameScore(finishedRun.score)}</p>
              <div className="mx-auto mt-6 grid max-w-3xl grid-cols-3 gap-2 sm:gap-4">
                <div><p className="text-[10px] font-bold uppercase text-foreground/55">{GAME_COPY.score}</p><p className="mt-1 text-xl font-black sm:text-3xl">{finishedRun.correctCount}/{finishedRun.questionCount}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-foreground/55">{GAME_COPY.time}</p><p className="mt-1 text-xl font-black sm:text-3xl">{formatGameDuration(finishedRun.durationMs)}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-foreground/55">{GAME_COPY.streak}</p><p className="mt-1 text-xl font-black sm:text-3xl">{finishedRun.bestStreak}</p></div>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => void startGame({ batchSize: gameSelectionBatchSize(finishedRun.batchSize), level: finishedRun.level, category: finishedRun.category, hardMode: finishedRun.hardMode })}
                  className="rounded-full border border-hot bg-hot px-7 py-3 text-sm font-black uppercase text-white hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
                >
                  {starting ? GAME_COPY.starting : "Play same settings"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelection({ batchSize: gameSelectionBatchSize(finishedRun.batchSize), level: finishedRun.level, category: finishedRun.category, hardMode: finishedRun.hardMode });
                    resetToLobby();
                  }}
                  className="rounded-full border border-line bg-surface px-7 py-3 text-sm font-black uppercase text-foreground hover:bg-surface-muted"
                >
                  Change settings
                </button>
              </div>
            </section>
          ) : (
            <section ref={setupRef} aria-label="Game setup" className="grid gap-4 border-y border-line bg-surface/70 px-4 py-5 sm:grid-cols-5 sm:px-6">
              <label className="text-xs font-bold uppercase text-foreground/60">{GAME_COPY.questions}
                <select value={selection.batchSize} onChange={(event) => setSelection((value) => ({ ...value, batchSize: event.target.value === "all" ? "all" : Number(event.target.value) as GameSelection["batchSize"] }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm font-black text-foreground">
                  <option value="all">All</option>
                  {setup?.batchSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold uppercase text-foreground/60">{GAME_COPY.level}
                <select value={selection.level ?? "all"} onChange={(event) => setSelection((value) => ({ ...value, level: event.target.value === "all" ? null : Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm font-black text-foreground">
                  <option value="all">{GAME_COPY.allLevels}</option>
                  {setup?.levels.map((level) => <option key={level} value={level}>Level {level}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold uppercase text-foreground/60">{GAME_COPY.category}
                <select value={selection.category} onChange={(event) => setSelection((value) => ({ ...value, category: event.target.value as GameSelection["category"] }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm font-black text-foreground">
                  {setup?.categories.map((category) => (
                    <option key={category} value={category}>
                      {GAME_CATEGORY_LABELS[category]} ({selection.level === null ? setup.totalCounts[category] : setup.countsByLevel[selection.level]?.[category] ?? 0})
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col sm:pt-6">
                <button
                  type="button"
                  aria-pressed={selection.hardMode}
                  onClick={() => setSelection((value) => ({ ...value, hardMode: !value.hardMode }))}
                  className={`h-11 rounded-lg border px-5 text-sm font-black uppercase transition ${selection.hardMode ? "border-red-600 bg-red-600 text-white" : "border-line bg-surface text-foreground hover:bg-surface-muted"}`}
                >
                  {GAME_COPY.hardMode}
                </button>
              </div>
              <div className="flex flex-col sm:pt-6">
                <button type="button" disabled={!canStart} onClick={() => void startGame()} className="h-11 rounded-lg border border-hot bg-hot px-5 text-sm font-black uppercase text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45">{starting ? GAME_COPY.starting : GAME_COPY.start}</button>
                <p className="mt-1 text-center text-[10px] font-bold text-foreground/50">{availableCount} items</p>
              </div>
              <p className="sm:col-span-5 text-xs font-semibold text-foreground/60">{availableCount < (selection.batchSize === "all" ? minimumItems : selection.batchSize) ? GAME_COPY.notEnoughItems : GAME_COPY.scoreRule}</p>
            </section>
          )}

          <GameLeaderboardFilters filters={leaderboardFilters} setup={setup!} onChange={(filters: LeaderboardFilters) => setLeaderboardFilters(filters)} />

          {gameError ? <p className="text-sm font-bold text-red-700">{gameError}</p> : null}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
            <GameLeaderboard days={leaderboardState.key === leaderboardKey ? leaderboardState.data?.days ?? [] : []} members={leaderboardState.key === leaderboardKey ? leaderboardState.data?.members ?? [] : []} metric={leaderboardFilters.metric} loading={leaderboardState.key !== leaderboardKey} />
            <GameRecentGames entries={leaderboardState.data?.recent ?? []} loading={!leaderboardState.data} onChallenge={challengeRecentRun} />
          </div>
      </main>
      <p className="text-center text-xs font-semibold text-foreground/45">Playing as {nickname}</p>
    </div>
  );
}
