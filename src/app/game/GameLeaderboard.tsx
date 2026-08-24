import { formatGameDuration, type GameMetric } from "@/lib/gameMode";
import { GAME_CATEGORY_LABELS, GAME_COPY, GAME_METRIC_LABELS } from "./GameMode.constants";
import type { GameLeaderboardDay } from "./GameMode.types";

type Props = {
  days: GameLeaderboardDay[];
  metric: GameMetric;
  loading: boolean;
};

function metricValue(entry: GameLeaderboardDay["entries"][number], metric: GameMetric): string {
  if (metric === "time") return formatGameDuration(entry.durationMs);
  if (metric === "streak") return String(entry.bestStreak);
  return entry.score.toLocaleString();
}

export default function GameLeaderboard({ days, metric, loading }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_45px_rgba(8,16,36,0.1)]">
      <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3 sm:px-6">
        <h2 className="text-lg font-black text-foreground sm:text-xl">{GAME_COPY.scoreboard}</h2>
        <span className="text-xs font-bold uppercase text-foreground/60">{GAME_METRIC_LABELS[metric]}</span>
      </div>
      {loading ? (
        <p className="px-5 py-10 text-center text-sm font-bold text-foreground/60">Loading scoreboard...</p>
      ) : days.every((day) => day.entries.length === 0) ? (
        <p className="px-5 py-10 text-center text-sm font-bold text-foreground/60">{GAME_COPY.noScores}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-bold uppercase text-foreground/55">
                <th className="px-4 py-3 sm:px-6">Day</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3 text-right">Questions</th>
                <th className="px-4 py-3 text-right">{GAME_METRIC_LABELS[metric]}</th>
                {metric !== "time" ? (
                  <th className="px-4 py-3 text-right">Time</th>
                ) : null}
                <th className="px-4 py-3 text-right sm:px-6">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {days.flatMap((day) => day.entries.map((entry, index) => (
                <tr key={`${day.date}:${entry.accountId}`} className="border-b border-line/70 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-bold text-foreground/65 sm:px-6">{day.date}</td>
                  <td className="px-4 py-3 text-lg font-black text-hot">#{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-foreground">{entry.nickname}</p>
                    <p className="text-xs font-semibold text-foreground/55">@{entry.wkUsername}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground/65">{GAME_CATEGORY_LABELS[entry.category]}</td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground/65">{entry.level === null ? "All" : entry.level}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-foreground/65">{entry.questionCount}</td>
                  <td className="px-4 py-3 text-right text-xl font-black text-accent">{metricValue(entry, metric)}</td>
                  {metric !== "time" ? (
                    <td className="px-4 py-3 text-right text-sm font-bold text-foreground/65">
                      {formatGameDuration(entry.durationMs)}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-right text-sm font-bold text-foreground/65 sm:px-6">{entry.correctCount}/{entry.questionCount}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
