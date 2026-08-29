import { formatGameDuration, formatGameScore, gameKindRules, type GameMetric } from "@/lib/gameMode";
import { SubjectTypePill } from "@/app/users/[nickname]/shared/ExplorerPill";
import {
  GAME_CATEGORY_LABELS,
  GAME_KIND_ACCENT,
  GAME_KIND_EMOJI,
  GAME_KIND_LABELS,
  GAME_LEVEL_PILL_CLASS,
  GAME_METRIC_LABELS,
  GAME_MIXED_PILL_CLASS,
  gameDifficultyLabel,
} from "./GameMode.constants";
import type { GameLeaderboardDay } from "./GameMode.types";

type Props = {
  days: GameLeaderboardDay[];
  members: Array<{ accountId: string; nickname: string; wkUsername: string }>;
  metric: GameMetric;
};

function metricValue(entry: GameLeaderboardDay["entries"][number], metric: GameMetric): string {
  if (metric === "time") return formatGameDuration(entry.durationMs);
  if (metric === "streak") return String(entry.bestStreak);
  return formatGameScore(entry.score);
}

/**
 * Phone layout for the scoreboard.
 *
 * The desktop table has eight columns, which on a phone would mean sideways
 * scrolling: the player's name scrolls out of view before their score scrolls
 * in, and rows cannot be compared. A leaderboard is a ranked list rather than a
 * spreadsheet, so each entry becomes a row of its own with the rank and name
 * leading, the chosen metric trailing, and the rest as supporting detail. The
 * date stops being a repeated column and becomes the group heading it always
 * was.
 */
export default function GameLeaderboardMobile({ days, members, metric }: Props) {
  const playedAccountIds = new Set(days.flatMap((day) => day.entries.map((entry) => entry.accountId)));
  const membersWithoutRuns = members.filter((member) => !playedAccountIds.has(member.accountId));

  return (
    <div className="md:hidden">
      {days.map((day) => (
        <section key={day.date} aria-label={day.date}>
          <h3 className="sticky top-0 z-10 border-b border-line bg-surface-muted px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            {day.date}
          </h3>
          <ol className="divide-y divide-line/70">
            {day.entries.map((entry, index) => (
              <li key={entry.runId} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0 text-lg font-black text-hot">#{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-black text-foreground">{entry.nickname}</span>
                      <span className="block truncate text-xs font-semibold text-foreground/55">@{entry.wkUsername}</span>
                    </span>
                  </p>
                  <p className="shrink-0 text-right">
                    <span className="block text-2xl font-black leading-none text-accent">{metricValue(entry, metric)}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/45">
                      {GAME_METRIC_LABELS[metric]}
                    </span>
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-foreground/60">
                  <span className={`subject-pill border-line bg-surface-muted ${GAME_KIND_ACCENT[entry.kind].text}`}>
                    <span aria-hidden="true">{GAME_KIND_EMOJI[entry.kind]}</span> {GAME_KIND_LABELS[entry.kind]}
                  </span>
                  {gameKindRules(entry.kind).usesLevel ? (
                    <span className={GAME_LEVEL_PILL_CLASS}>{entry.level === null ? "All" : `L${entry.level}`}</span>
                  ) : null}
                  {entry.category === "mixed" ? (
                    <span className={GAME_MIXED_PILL_CLASS}>Mixed</span>
                  ) : (
                    <SubjectTypePill type={entry.category}>{GAME_CATEGORY_LABELS[entry.category]}</SubjectTypePill>
                  )}
                  <span className={entry.ultraMode ? "text-fuchsia-700" : entry.choiceCount >= 3 ? "text-red-600" : undefined}>
                    {gameDifficultyLabel(entry.choiceCount, entry.ultraMode)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground/55">
                  {entry.correctCount}/{entry.questionCount} correct
                  {metric !== "time" ? ` · ${formatGameDuration(entry.durationMs)}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {membersWithoutRuns.length > 0 ? (
        <section aria-label="Not played">
          <h3 className="border-y border-line bg-surface-muted px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/50">
            Not played
          </h3>
          <ul className="divide-y divide-line/70">
            {membersWithoutRuns.map((member) => (
              <li key={member.accountId} className="flex items-baseline justify-between gap-3 px-4 py-3 text-foreground/45">
                <span className="min-w-0">
                  <span className="block truncate font-black">{member.nickname}</span>
                  <span className="block truncate text-xs font-semibold">@{member.wkUsername}</span>
                </span>
                <span className="shrink-0 text-sm font-bold">&mdash;</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
