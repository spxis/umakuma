import MemberBoardRows from "@/app/shared/board/MemberBoardRows";
import { memberBoardGap, type MemberBoardEntry } from "@/app/shared/board/memberBoardView";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { ugLevelBadge, unLevelBadge } from "@/lib/levelBadge";

import type { LadderBoardEntry } from "./lib/ladderBoard";
import { LADDER_BOARD_COPY as copy } from "./ladderBoardCopy";

type Props = {
  entries: LadderBoardEntry[];
  viewer: { isAdmin: boolean; address: string | null; accountId: string | null };
};

/**
 * The UmaKuma ladder board.
 *
 * The row shape belongs to `MemberBoardRows`, which every board shares. What
 * is here is the ladder-specific half: the level badge in the member's own
 * system, and the three counts the score is built from.
 *
 * **The badge names its path.** UN20 and UG20 are different achievements over
 * the same 2,235 kanji, and on the board of everyone the two sit side by side
 * - so a bare "20" would be the one number on the page nobody could check.
 */
export default function LadderBoardRows({ entries, viewer }: Props) {
  const rows: MemberBoardEntry[] = entries.map((entry) => ({
    ...entry,
    isViewer: viewer.accountId !== null && entry.id === viewer.accountId,
    href: canOpenLadderRow(entry, viewer) && entry.address
      ? `/users/${encodeURIComponent(entry.address)}/umakuma`
      : null,
    caption: (
      <span className="tabular-nums" translate="no">
        {badgeFor(entry.stream, entry.level)}
      </span>
    ),
    figure: copy.score(entry.score),
    figureNote: memberBoardGap(entry.toPassAbove, {
      leading: copy.leading,
      level: copy.toPassLevel,
      toPass: copy.toPass,
    }),
    detail: (
      <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
        {copy.learned(entry.learned)} · {copy.passed(entry.passed)} · {copy.burned(entry.burned)}
      </p>
    ),
  }));

  return <MemberBoardRows entries={rows} copy={{ sharedPlace: copy.sharedPlace, you: copy.you }} />;
}

/** The level, written in the system the member is actually climbing. */
function badgeFor(stream: LadderStreamValue, level: number): string {
  return (stream === LADDER_STREAMS.ug ? ugLevelBadge(level) : unLevelBadge(level)) ?? "";
}

/**
 * Whose pages a reader may open from a row.
 *
 * The same rule the XP board follows: an admin may open anybody's, a member
 * may open their own, and a row without an address opens nothing. Being
 * listable is a decision about the board, not a key to a member's pages.
 */
export function canOpenLadderRow(
  entry: LadderBoardEntry,
  viewer: { isAdmin: boolean; address: string | null },
): boolean {
  if (!entry.address) return false;
  if (viewer.isAdmin) return true;
  const normalized = viewer.address?.trim().toLowerCase() ?? null;
  return normalized !== null && entry.address.trim().toLowerCase() === normalized;
}
