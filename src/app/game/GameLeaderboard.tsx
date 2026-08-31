import { formatGameDuration, gameKindRules, type GameMetric } from "@/lib/gameMode";
import { formatGameScore } from "@/lib/gameScoring";
import GameCategoryPill from "./GameCategoryPill";
import { GAME_COPY, GAME_KIND_ACCENT, GAME_KIND_EMOJI,
  gameKindLabelWithCountry, GAME_LEVEL_PILL_CLASS, GAME_METRIC_LABELS, gameDifficultyLabel } from "./GameMode.constants";
import GameLeaderboardMobile from "./GameLeaderboardMobile";
import type { GameLeaderboardDay } from "./GameMode.types";
import LoadingState from "../shared/LoadingState";

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
        <LoadingState label="scoreboard" />
      ) : (
        <>
        <GameLeaderboardMobile days={days} members={members} metric={metric} />
        <div className="hidden md:block xl:max-h-96 xl:overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-bold uppercase text-foreground/55">
                <th className="px-4 py-3 sm:px-6">Day</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Game</th>
                <th className="px-4 py-3">Difficulty</th>
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
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap text-sm font-bold text-foreground/65">
                      <span className={`subject-pill border-line bg-surface-muted ${GAME_KIND_ACCENT[entry.kind].text}`}>
                        <span aria-hidden="true">{GAME_KIND_EMOJI[entry.kind]}</span> {gameKindLabelWithCountry(entry.kind, entry.mapCountry)}
                      </span>
                      {gameKindRules(entry.kind).usesLevel ? (
                        <span className={GAME_LEVEL_PILL_CLASS}>{entry.level === null ? "All" : `L${entry.level}`}</span>
                      ) : null}
                    <GameCategoryPill kind={entry.kind} category={entry.category} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-foreground/65">
                    <span className={entry.ultraMode ? "text-fuchsia-700" : entry.choiceCount >= 3 ? "text-red-600" : undefined}>{gameDifficultyLabel(entry.kind, entry.choiceCount, entry.ultraMode, entry.direction)}</span>
                  </td>
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
                  <td className="px-4 py-3 text-sm font-bold" colSpan={2}>Not played</td>
                  <td className="px-4 py-3 text-right text-xl font-black">{metric === "time" ? "-" : "0"}</td>
                  {metric !== "time" ? <td className="px-4 py-3 text-right text-sm font-bold">-</td> : null}
                  <td className="px-4 py-3 text-right text-sm font-bold sm:px-6">0/0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
