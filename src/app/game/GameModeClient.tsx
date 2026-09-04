"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  GAME_KINDS,
  gameKindRules,
  gameProgressFlags,
  isGameBatchSize,
  type GameKind,
  type GameLeaderboardEntry,
} from "@/lib/gameMode";
import { gameKindHref } from "@/lib/gameKindAddress";
import GameLeaderboard from "./GameLeaderboard";
import GameMapRunner from "./GameMapRunner";
import GameLeaderboardFilters from "./GameLeaderboardFilters";
import GameRecentGames from "./GameRecentGames";
import GameResultsPanel from "./GameResultsPanel";
import GameRunner from "./GameRunner";
import GameSetupPanel from "./GameSetupPanel";
import GamesHub from "./GamesHub";
import { GAME_COPY } from "./GameMode.constants";
import { buildGameHubCards } from "./gameHubCards";
import type {
  GameLeaderboardResponse,
  GameLeaderboardFilters as LeaderboardFilters,
  GameModeClientProps,
  GamePhase,
  GameSelection,
  GameSetupResponse,
} from "./GameMode.types";
import { useGameSession } from "./useGameSession";
import { usePersistedGameSettings } from "./usePersistedGameSettings";
import { GAME_KIND_OPENED_EVENT, GAME_KIND_REQUEST_EVENT } from "./GameSubNav";

function gameSelectionBatchSize(batchSize: number): GameSelection["batchSize"] {
  return isGameBatchSize(batchSize) ? batchSize : "all";
}

export default function GameModeClient({ accountId, nickname, member, initialKind, isAdmin = false }: GameModeClientProps) {
  const [phase, setPhase] = useState<GamePhase>(initialKind ? "lobby" : "hub");
  const [setup, setSetup] = useState<GameSetupResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupRefresh, setSetupRefresh] = useState(0);
  const { selection: [selection, setSelection], filters: [leaderboardFilters, setLeaderboardFilters] } = usePersistedGameSettings();
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const setupRef = useRef<HTMLDivElement | null>(null);

  const onStarted = useCallback(() => setPhase("playing"), []);
  const onCompleted = useCallback(() => {
    setPhase("results");
    setLeaderboardRefresh((value) => value + 1);
    setSetupRefresh((value) => value + 1);
  }, []);
  const session = useGameSession({ accountId, onStarted, onCompleted });

  // On the hub the scoreboard follows the filter; inside a game it follows that game.
  const leaderboardKind: "any" | GameKind = phase === "hub" ? leaderboardFilters.kind : selection.kind;

  /*
   * The address names the game, so a reload lands where the member was and a
   * link to Practice opens Practice. Applied once on arrival: after that the
   * client owns the phase and writes the address rather than reading it.
   */
  useEffect(() => {
    if (!initialKind) return;
    setSelection((value) => ({ ...value, kind: initialKind }));
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- the address is read once, on arrival. */
  }, []);
  // Shiritori and Daily always record one category, so a leftover category
  // filter would hide every run for them.
  const leaderboardCategory = leaderboardKind !== "any" && gameKindRules(leaderboardKind).fixedCategory !== null
    ? "all"
    : leaderboardFilters.mode;
  const leaderboardKey = `${leaderboardKind}:${leaderboardFilters.batchSize}:${leaderboardFilters.level ?? "all"}:${leaderboardCategory}:${leaderboardFilters.range}:${leaderboardFilters.metric}:${leaderboardFilters.hardMode}:${leaderboardFilters.ultraMode}:${leaderboardRefresh}`;
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
  }, [accountId, setupRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      kind: leaderboardKind,
      batchSize: String(leaderboardFilters.batchSize),
      level: leaderboardFilters.level === "any" ? "any" : leaderboardFilters.level === null ? "all" : String(leaderboardFilters.level),
      category: leaderboardCategory,
      range: leaderboardFilters.range,
      metric: leaderboardFilters.metric,
      hardMode: leaderboardFilters.hardMode ? "hard" : "all",
      ultraMode: leaderboardFilters.ultraMode ? "ultra" : "all",
    });
    void fetch(`/api/game/${accountId}/leaderboard?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as GameLeaderboardResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load scoreboard.");
        setLeaderboardState({ key: leaderboardKey, data: payload });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        session.setError(error instanceof Error ? error.message : "Could not load scoreboard.");
      });
    return () => controller.abort();
    // `session.setError` is stable; `leaderboardKey` captures every filter input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, leaderboardKey]);

  function openLobby(kind: GameKind) {
    const rules = gameKindRules(kind);
    /* The game is where you are, so it is in the address; back returns to the hub. */
    if (typeof window !== "undefined") {
      const next = gameKindHref(member, kind);
      if (window.location.pathname !== next) window.history.pushState(null, "", next);
    }
    setSelection((value) => ({
      ...value,
      kind,
      ultraMode: rules.usesUltraMode ? value.ultraMode : false,
      choiceCount: rules.usesHardMode ? value.choiceCount : 2,
    }));
    session.reset();
    setPhase("lobby");
    window.requestAnimationFrame(() => setupRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  /*
   * The header's second row asks for a kind rather than linking to one, since a
   * game is a phase of this client rather than a route. Registered after
   * `openLobby` is defined so it always opens the current one.
   */
  useEffect(() => {
    const onRequest = (event: Event) => {
      const kind = (event as CustomEvent<{ kind: GameKind }>).detail?.kind;
      if (kind) openLobby(kind);
    };
    window.addEventListener(GAME_KIND_REQUEST_EVENT, onRequest as EventListener);
    return () => window.removeEventListener(GAME_KIND_REQUEST_EVENT, onRequest as EventListener);
  });

  /*
   * The row in the header draws the games, so it has to be told which one is
   * open - the hub lights none, a lobby or a run lights its own.
   */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(GAME_KIND_OPENED_EVENT, { detail: { kind: phase === "hub" ? null : selection.kind } }),
    );
  }, [phase, selection.kind]);

  function backToHub() {
    if (typeof window !== "undefined") {
      const next = gameKindHref(member, null);
      if (window.location.pathname !== next) window.history.pushState(null, "", next);
    }
    session.reset();
    setPhase("hub");
  }

  function challengeRecentRun(entry: GameLeaderboardEntry) {
    setSelection((value) => ({
      ...value,
      kind: entry.kind,
      batchSize: gameSelectionBatchSize(entry.batchSize),
      level: entry.level,
      category: entry.category,
      choiceCount: entry.choiceCount,
      ultraMode: entry.ultraMode,
    }));
    session.reset();
    setPhase("lobby");
    window.requestAnimationFrame(() => setupRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  if (!setup && !setupError) {
    return <p className="py-24 text-center text-sm font-bold text-foreground/65">{GAME_COPY.loading}</p>;
  }
  if (setupError || !setup) {
    return <p className="py-24 text-center text-sm font-bold text-red-700">{setupError ?? GAME_COPY.loadError}</p>;
  }

  const activeGame = session.activeGame;
  const currentQuestion = session.currentQuestion;
  if (phase === "playing" && currentQuestion && activeGame) {
    const flags = gameProgressFlags(activeGame.run.kind, activeGame.run.ultraMode);
    // Map mode answers on the country instead of the corner board; every other prop is the same.
    const Runner = gameKindRules(activeGame.run.kind).usesCornersBoard ? GameRunner : GameMapRunner;
    return (
      <Runner
        question={currentQuestion}
        questionIndex={session.questionIndex}
        questionTotal={activeGame.questions.length}
        kind={activeGame.run.kind}
        endless={flags.endless}
        correctCount={activeGame.run.correctCount}
        elapsedMs={session.elapsedMs}
        remainingMs={session.remainingMs}
        answering={session.answering}
        feedback={session.feedback}
        error={session.error}
        onAnswer={(subjectId) => void session.answerQuestion(currentQuestion, subjectId)}
        onExit={backToHub}
      />
    );
  }

  const finishedRun = phase === "results" ? activeGame?.run ?? null : null;

  return (
    <div className="w-full pb-10">
      {/* The page's own header is drawn above this, the way every page's is. */}
      <main className="space-y-5 pb-5 pt-1 sm:pb-7">
        <div ref={setupRef}>
          {finishedRun ? (
            <GameResultsPanel
              run={finishedRun}
              starting={session.starting}
              replayable={!gameKindRules(finishedRun.kind).oncePerDay}
              onPlayAgain={() => void session.startGame({
                ...selection,
                kind: finishedRun.kind,
                batchSize: gameSelectionBatchSize(finishedRun.batchSize),
                level: finishedRun.level,
                category: finishedRun.category,
                choiceCount: finishedRun.choiceCount,
                ultraMode: finishedRun.ultraMode,
              })}
              onChangeSettings={() => {
                session.reset();
                setPhase("lobby");
              }}
              onBackToGames={backToHub}
            />
          ) : phase === "lobby" ? (
            <GameSetupPanel
              accountId={accountId}
              setup={setup}
              selection={selection}
              isAdmin={isAdmin}
              starting={session.starting}
              onChange={setSelection}
              onStart={() => void session.startGame(selection)}
              onBack={backToHub}
            />
          ) : (
            <GamesHub
              cards={buildGameHubCards(setup, selection)}
              selectedKind={selection.kind}
              onSelect={openLobby}
            />
          )}
        </div>

        <GameLeaderboardFilters
          filters={leaderboardFilters}
          setup={setup}
          lockedKind={phase === "hub" ? null : selection.kind}
          onChange={(filters: LeaderboardFilters) => setLeaderboardFilters(filters)}
        />

        {session.error ? <p className="text-sm font-bold text-red-700">{session.error}</p> : null}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
          <GameLeaderboard
            days={leaderboardState.key === leaderboardKey ? leaderboardState.data?.days ?? [] : []}
            members={leaderboardState.key === leaderboardKey ? leaderboardState.data?.members ?? [] : []}
            metric={leaderboardFilters.metric}
            loading={leaderboardState.key !== leaderboardKey}
          />
          <GameRecentGames
            entries={leaderboardState.data?.recent ?? []}
            loading={!leaderboardState.data}
            onChallenge={challengeRecentRun}
          />
        </div>
      </main>
      <p className="text-center text-xs font-semibold text-foreground/60">
        Playing as {nickname}
        {selection.kind === GAME_KINDS.daily ? ` · ${setup.availability.daily.dateKey}` : ""}
      </p>
    </div>
  );
}
