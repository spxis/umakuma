import { playAccuracyPercent, type GameKindActivity } from "@/lib/gameActivity";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import { GAME_COPY } from "./GameMode.constants";

type Props = {
  activity: GameKindActivity | null;
  accentText: string;
};

/**
 * The one-line footer under each hub card: who is playing this right now, or
 * failing that, who played it last and what they scored.
 *
 * Live wins over last played. Seeing that somebody is mid-round is the reason
 * to look at all, and a stale result underneath it would only compete.
 */
export default function GameCardActivity({ activity, accentText }: Props) {
  const live = activity?.live ?? [];

  if (live.length > 0) {
    const [first, ...rest] = live;
    const others =
      rest.length > 0 ? ` ${GAME_COPY.activityAndOthers.replace("{count}", String(rest.length))}` : "";

    return (
      <span className={`mt-3 flex min-w-0 items-center gap-1.5 text-xs font-black ${accentText}`}>
        <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
        <span className="truncate">
          {first.playerName}
          {others} {GAME_COPY.activityPlayingNow}
        </span>
      </span>
    );
  }

  const last = activity?.last ?? null;

  if (!last) {
    return (
      <span className="mt-3 block truncate text-xs font-bold text-foreground/40">
        {GAME_COPY.activityNeverPlayed}
      </span>
    );
  }

  const accuracy = playAccuracyPercent(last);

  return (
    <span className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs font-bold text-foreground/55">
      <span className="truncate font-black text-foreground/75">{last.playerName}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{last.score.toLocaleString("en-CA")}</span>
      {accuracy === null ? null : (
        <>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{accuracy}%</span>
        </>
      )}
      <span aria-hidden="true">·</span>
      <span>{formatRelativeFromNow(last.completedAt, { style: "short" })}</span>
    </span>
  );
}
