import { formatGameDuration, formatGameScore, type GameMetric } from "@/lib/gameMode";
import { SubjectTypePill } from "@/app/users/[nickname]/shared/ExplorerPill";
import { GAME_CATEGORY_LABELS, GAME_COPY, GAME_LEVEL_PILL_CLASS, GAME_METRIC_LABELS, GAME_MIXED_PILL_CLASS } from "./GameMode.constants";
import type { GameLeaderboardDay } from "./GameMode.types";

type Props = {
  days: GameLeaderboardDay[];
  members: Array<{ accountId: string; nickname: string; wkUsername: string }>;
  metric: GameMetric;
  loading: boolean;
};

function metricValue(entry: GameLeaderboardDay["entries"][number], metric: GameMetric): string {
  if (metric === "time") return formatGameDuration(entry.durationMs);
  if (metric === "streak") return String(entry.bestStreak);
  return formatGameScore(entry.score);
}

export default function GameLeaderboard({ days, members, metric, loading }: Props) {
  const playedAccountIds = new Set(days.flatMap((day) => day.entries.map((entry) => entry.accountId)));
  const membersWithoutRuns = members.filter((member) => !playedAccountIds.has(member.accountId));
  const playedRunCount = days.reduce((count, day) => count + day.entries.length, 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_45px_rgba(8,16,36,0.1)]">
      <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3 sm:px-6 xl:h-17">
        <h2 className="text-lg font-black text-foreground sm:text-xl">{GAME_COPY.scoreboard}</h2>
        <span className="text-xs font-bold uppercase text-foreground/60">{GAME_METRIC_LABELS[metric]}</span>
      </div>
      {loading ? (
        <p className="px-5 py-10 text-center text-sm font-bold text-foreground/60">Loading scoreboard...</p>
      ) : (
        <div className="overflow-x-auto xl:max-h-96 xl:overflow-y-auto">
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
                <tr key={entry.runId} className="border-b border-line/70 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-bold text-foreground/65 sm:px-6">{day.date}</td>
                  <td className="px-4 py-3 text-lg font-black text-hot">#{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-foreground">{entry.nickname}</p>
                    <p className="text-xs font-semibold text-foreground/55">@{entry.wkUsername}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground/65">
                    {entry.category === "mixed" ? (
                      <span className={GAME_MIXED_PILL_CLASS}>Mixed</span>
                    ) : (
                      <SubjectTypePill type={entry.category}>{GAME_CATEGORY_LABELS[entry.category]}</SubjectTypePill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground/65">
                    <span className={GAME_LEVEL_PILL_CLASS}>{entry.level === null ? "All levels" : `L${entry.level}`}</span>
                  </td>
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
              {membersWithoutRuns.map((member, index) => (
                <tr key={`not-played:${member.accountId}`} className="border-b border-line/70 last:border-b-0 text-foreground/45">
                  <td className="px-4 py-3 text-sm font-bold sm:px-6">-</td>
                  <td className="px-4 py-3 text-lg font-black">#{playedRunCount + index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-black">{member.nickname}</p>
                    <p className="text-xs font-semibold">@{member.wkUsername}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold" colSpan={3}>Not played</td>
                  <td className="px-4 py-3 text-right text-xl font-black">{metric === "time" ? "-" : "0"}</td>
                  {metric !== "time" ? <td className="px-4 py-3 text-right text-sm font-bold">-</td> : null}
                  <td className="px-4 py-3 text-right text-sm font-bold sm:px-6">0/0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
