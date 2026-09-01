import { playAccuracyPercent, type GameKindActivity, type GameLastPlay } from "@/lib/gameActivity";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import { GAME_COPY } from "./GameMode.constants";

type Props = {
  activity: GameKindActivity | null;
  accentText: string;
};

function PlayLine({ prefix, play }: { prefix: string; play: GameLastPlay }) {
  const accuracy = playAccuracyPercent(play);

  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs font-bold text-foreground/60">
      <span className="shrink-0 font-black uppercase tracking-wide text-foreground/60">{prefix}</span>
      <span className="truncate font-black text-foreground/75">{play.playerName}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{play.score.toLocaleString("en-CA")}</span>
      {accuracy === null ? null : (
        <>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{accuracy}%</span>
        </>
      )}
      <span aria-hidden="true">·</span>
      <span>{formatRelativeFromNow(play.completedAt, { style: "short" })}</span>
    </span>
  );
}

/**
 * The activity footer under each hub card.
 *
 * All three facts show together rather than one winning: who is playing right
 * now, who holds the last result, and how the person reading it did. They
 * answer different questions, and hiding one behind another meant a live round
 * erased the score somebody had just set.
 *
 * The viewer's own line is suppressed when they already are the last player,
 * since that would print the same run twice.
 */
export default function GameCardActivity({ activity, accentText }: Props) {
  const live = activity?.live ?? [];
  const last = activity?.last ?? null;
  const viewerLast = activity?.viewerLast ?? null;

  const viewerIsLastPlayer =
    last !== null && viewerLast !== null && last.accountId === viewerLast.accountId;

  const [firstLive, ...restLive] = live;
  const others =
    restLive.length > 0
      ? ` ${GAME_COPY.activityAndOthers.replace("{count}", String(restLive.length))}`
      : "";

  return (
    <span className="mt-3 flex min-w-0 flex-col gap-1">
      {firstLive ? (
        <span className={`flex min-w-0 items-center gap-1.5 text-xs font-black ${accentText}`}>
          <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          <span className="truncate">
            {firstLive.playerName}
            {others} {GAME_COPY.activityPlayingNow}
          </span>
        </span>
      ) : null}

      {last ? (
        <PlayLine prefix={GAME_COPY.activityLastPrefix} play={last} />
      ) : (
        <span className="block truncate text-xs font-bold text-foreground/60">
          {GAME_COPY.activityNeverPlayed}
        </span>
      )}

      {viewerLast && !viewerIsLastPlayer ? (
        <PlayLine prefix={GAME_COPY.activityYouPrefix} play={viewerLast} />
      ) : null}
    </span>
  );
}
