import { formatGameDuration, gameKindRules, type GameLeaderboardEntry } from "@/lib/gameMode";
import { formatGameScore } from "@/lib/gameScoring";
import { formatRelativeFromNow } from "@/lib/timeFormat";
import GameCategoryPill from "./GameCategoryPill";
import { GAME_COPY, GAME_KIND_ACCENT, GAME_KIND_EMOJI, GAME_KIND_LABELS, GAME_LEVEL_PILL_CLASS, gameDifficultyLabel } from "./GameMode.constants";
import LoadingState from "../shared/LoadingState";

type Props = {
  entries: GameLeaderboardEntry[];
  loading: boolean;
  onChallenge: (entry: GameLeaderboardEntry) => void;
};

export default function GameRecentGames({ entries, loading, onChallenge }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_45px_rgba(8,16,36,0.1)]">
      <div className="border-b border-line bg-surface-muted px-4 py-3 xl:h-17">
        <h2 className="text-lg font-black text-foreground sm:text-xl">{GAME_COPY.recentGames}</h2>
        <p className="text-xs font-semibold text-foreground/55">All modes. Select a run to challenge it.</p>
      </div>
      {loading ? (
        <LoadingState label="recent games" />
      ) : entries.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm font-bold text-foreground/60">{GAME_COPY.noRecentGames}</p>
      ) : (
        <div className="divide-y divide-line/70 xl:max-h-96 xl:overflow-y-auto">
          {entries.map((entry) => (
            <button key={entry.runId} type="button" onClick={() => onChallenge(entry)} className="grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-3 text-left transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent">
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-foreground">{entry.nickname}</span>
                <span className="mt-1 flex flex-nowrap items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-foreground/60">
                  <span className={`subject-pill border-line bg-surface-muted ${GAME_KIND_ACCENT[entry.kind].text}`}>
                    <span aria-hidden="true">{GAME_KIND_EMOJI[entry.kind]}</span> {GAME_KIND_LABELS[entry.kind]}
                  </span>
                  {gameKindRules(entry.kind).usesLevel ? (
                    <span className={GAME_LEVEL_PILL_CLASS}>{entry.level === null ? "All" : `L${entry.level}`}</span>
                  ) : null}
                  <GameCategoryPill kind={entry.kind} category={entry.category} />
                  <span>{gameDifficultyLabel(entry.choiceCount, entry.ultraMode, entry.direction)}</span>
                </span>
                <span className="mt-1 block text-[10px] font-bold uppercase text-foreground/45">{formatRelativeFromNow(entry.completedAt, { style: "short" })}</span>
              </span>
              <span className="text-right">
                <span className="block text-lg font-black text-accent">{formatGameScore(entry.score)}</span>
                <span className="block text-xs font-bold text-foreground/55">{entry.correctCount}/{entry.questionCount} · {formatGameDuration(entry.durationMs)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}