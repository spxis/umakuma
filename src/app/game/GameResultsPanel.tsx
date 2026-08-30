import { GAME_KINDS, formatGameDuration, type GameRunSummary } from "@/lib/gameMode";
import { formatGameScore } from "@/lib/gameScoring";
import GameCategoryPill from "./GameCategoryPill";
import {
  GAME_COPY,
  GAME_KIND_ACCENT,
  GAME_KIND_EMOJI,
  GAME_KIND_LABELS,
  GAME_LEVEL_PILL_CLASS,
  gameDifficultyLabel,
  gameTimeLimitLabel,
} from "./GameMode.constants";

type Props = {
  run: GameRunSummary;
  starting: boolean;
  replayable: boolean;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
  onBackToGames: () => void;
};

export default function GameResultsPanel({
  run,
  starting,
  replayable,
  onPlayAgain,
  onChangeSettings,
  onBackToGames,
}: Props) {
  const accent = GAME_KIND_ACCENT[run.kind];
  const streakLabel = run.kind === GAME_KINDS.shiritori ? GAME_COPY.chainLength : GAME_COPY.streak;

  return (
    <section className="border-y border-line bg-surface-muted px-4 py-8 text-center sm:py-12">
      <p className={`text-xs font-black uppercase ${accent.text}`}>
        <span aria-hidden="true">{GAME_KIND_EMOJI[run.kind]}</span> {GAME_KIND_LABELS[run.kind]} · {GAME_COPY.complete}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-black text-foreground/65">
        {run.kind === GAME_KINDS.match || run.kind === GAME_KINDS.timeAttack ? (
          <span className={GAME_LEVEL_PILL_CLASS}>{run.level === null ? "All levels" : `L${run.level}`}</span>
        ) : null}
        <GameCategoryPill kind={run.kind} category={run.category} />
        <span>{run.questionCount} questions</span>
        {run.timeLimitMs !== null ? <span>{gameTimeLimitLabel(run.timeLimitMs)}</span> : null}
        <span>{gameDifficultyLabel(run.choiceCount, run.ultraMode, run.direction)}</span>
      </div>
      <p className={`mt-3 text-7xl font-black leading-none sm:text-9xl ${accent.text}`}>{formatGameScore(run.score)}</p>
      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-3 gap-2 sm:gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-foreground/55">{GAME_COPY.correct}</p>
          <p className="mt-1 text-xl font-black sm:text-3xl">{run.correctCount}/{run.questionCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-foreground/55">{GAME_COPY.time}</p>
          <p className="mt-1 text-xl font-black sm:text-3xl">{formatGameDuration(run.durationMs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-foreground/55">{streakLabel}</p>
          <p className="mt-1 text-xl font-black sm:text-3xl">{run.bestStreak}</p>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        {replayable ? (
          <button
            type="button"
            disabled={starting}
            onClick={onPlayAgain}
            className="rounded-full border border-hot bg-hot px-7 py-3 text-sm font-black text-white hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
          >
            {starting ? GAME_COPY.starting : "Play same settings"}
          </button>
        ) : (
          <p className="text-sm font-bold text-foreground/60">{GAME_COPY.dailyOneAttempt}</p>
        )}
        <button
          type="button"
          onClick={onChangeSettings}
          className="rounded-full border border-line bg-surface px-7 py-3 text-sm font-black text-foreground hover:bg-surface-muted"
        >
          Change settings
        </button>
        <button
          type="button"
          onClick={onBackToGames}
          className="rounded-full border border-line bg-surface px-7 py-3 text-sm font-black text-foreground hover:bg-surface-muted"
        >
          {GAME_COPY.backToGames}
        </button>
      </div>
    </section>
  );
}
