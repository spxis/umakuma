import { formatGameDuration, formatGameScore, type GameLeaderboardEntry } from "@/lib/gameMode";
import { formatRelativeFromNow } from "@/lib/timeFormat";
import { SubjectTypePill } from "@/app/users/[nickname]/shared/ExplorerPill";
import { GAME_CATEGORY_LABELS, GAME_COPY, GAME_LEVEL_PILL_CLASS, GAME_MIXED_PILL_CLASS } from "./GameMode.constants";

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
        <p className="px-4 py-10 text-center text-sm font-bold text-foreground/60">Loading recent games...</p>
      ) : entries.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm font-bold text-foreground/60">{GAME_COPY.noRecentGames}</p>
      ) : (
        <div className="divide-y divide-line/70 xl:max-h-96 xl:overflow-y-auto">
          {entries.map((entry) => (
            <button key={entry.runId} type="button" onClick={() => onChallenge(entry)} className="grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-3 text-left transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent">
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-foreground">{entry.nickname}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-foreground/60">
                  {entry.category === "mixed" ? (
                    <span className={GAME_MIXED_PILL_CLASS}>Mixed</span>
                  ) : (
                    <SubjectTypePill type={entry.category}>{GAME_CATEGORY_LABELS[entry.category]}</SubjectTypePill>
                  )}
                  <span className={GAME_LEVEL_PILL_CLASS}>{entry.level === null ? "All levels" : `L${entry.level}`}</span>
                  <span>{entry.questionCount} questions</span>
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