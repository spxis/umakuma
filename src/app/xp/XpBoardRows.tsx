import MemberBoardRows from "@/app/shared/board/MemberBoardRows";
import { memberBoardGap, type MemberBoardEntry } from "@/app/shared/board/memberBoardView";
import { XP_RANKS } from "@/lib/xp/xpCurve";

import { canOpenXpBoardRow, type XpBoardEntry } from "./lib/xpBoard";
import { XP_BOARD_COPY as copy } from "./xpBoardCopy";

type Props = {
  entries: XpBoardEntry[];
  viewer: { isAdmin: boolean; address: string | null; accountId: string | null };
};

/**
 * The XP board.
 *
 * The row shape belongs to `MemberBoardRows`, which every board shares; what
 * is here is the XP-specific half - the rank name under the name, the bar
 * showing how far through that rank a member is, and the words for the gap to
 * the row above.
 */
export default function XpBoardRows({ entries, viewer }: Props) {
  const rows: MemberBoardEntry[] = entries.map((entry) => {
    const percent = Math.round(entry.standing.ratio * 100);
    const atTop = entry.standing.level >= XP_RANKS;

    return {
      ...entry,
      isViewer: viewer.accountId !== null && entry.id === viewer.accountId,
      href:
        canOpenXpBoardRow(entry, viewer) && entry.address
          ? `/users/${encodeURIComponent(entry.address)}/xp`
          : null,
      caption: entry.rankName,
      figure: copy.total(entry.xp),
      figureNote: memberBoardGap(entry.toPassAbove, {
        leading: copy.leading,
        level: copy.toPassLevel,
        toPass: copy.toPass,
      }),
      detail: (
        <>
          <div
            role="progressbar"
            aria-label={copy.progressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-[11px] font-semibold tabular-nums text-foreground/60">
            {atTop ? copy.atTop : copy.into(entry.standing.into, entry.standing.span)}
          </p>
        </>
      ),
    };
  });

  return <MemberBoardRows entries={rows} copy={{ sharedPlace: copy.sharedPlace, you: copy.you }} />;
}
