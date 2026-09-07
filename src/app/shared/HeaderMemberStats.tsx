import Link from "next/link";

import { ladderBoardPath } from "@/app/ladder/lib/ladderAddress";
import { WANIKANI_BOARD_HREF } from "@/app/leaderboard/lib/leaderboardAddress";
import type { ViewerMenuInfo } from "@/app/users/[nickname]/UserDashboardTabs.types";
import { ourLevelBadge, wkLevelBadge } from "@/lib/levelBadge";

import { HEADER_MEMBER_STATS_COPY as copy } from "./headerMemberStatsCopy";
import { viewerAddress } from "./viewerAddress";

/**
 * The member's own numbers, at the right of the header's second row.
 *
 * This slot used to carry the release codename. The footer already prints the
 * version, the codename, its reading and the date, so nothing was lost by
 * giving the space to the person using the site instead of to the build.
 *
 * It answers for the *viewer*, never for the page. An admin reading somebody
 * else's pages still sees their own XP here, because these are the numbers you
 * carry around with you — the page you happen to be on has its own headings for
 * whoever it belongs to. That is why it reads `viewerMenuInfo` directly rather
 * than the resolved username the rest of the header is drawn from.
 *
 * A signed-out visitor gets nothing at all. Drawing `0 XP` to a stranger states
 * a fact about an account that does not exist, and the row is better short.
 */
/*
 * The two level badges, which are the same thing twice: a quiet number that
 * lights up on hover like the XP and the theme beside it. Written once so the
 * pair cannot end up looking like two different kinds of control - they sit
 * next to each other and are read together.
 *
 * `hidden ... sm:inline` is the giving-way rule below, kept here with the rest
 * of the badge's look rather than repeated at both call sites.
 */
const badgeClassName = "hidden rounded-md text-foreground/60 transition hover:text-accent sm:inline";

export default function HeaderMemberStats({
  viewerMenuInfo,
  className = "",
}: {
  viewerMenuInfo: ViewerMenuInfo | null;
  className?: string;
}) {
  /*
   * `xp` is null for anyone who is not a member — signed out, or a session
   * whose account was turned away. Checked rather than defaulted to zero: the
   * difference between "no XP yet" and "no account" is the whole of whether
   * this strip should exist.
   */
  if (!viewerMenuInfo || viewerMenuInfo.xp === null) {
    return null;
  }

  const address = viewerAddress(viewerMenuInfo);
  /*
   * The badge names the ladder the member is actually on. It said `UN` at
   * everybody for as long as it existed - it read `Account.unLevel` whoever
   * was asking - so a UG member was shown a standing they are not taught
   * against, under a prefix claiming they were.
   *
   * One answer decides the prefix and the board both, which is the point of
   * taking it from the stream rather than from the column: a badge reading
   * `UG23` that opens the UN board would be a worse bug than the one it
   * replaced, because it would look right.
   */
  const stream = viewerMenuInfo.ladderStream;
  const level = viewerMenuInfo.ladderLevel;
  const uk = ourLevelBadge(stream, level);
  const wk = wkLevelBadge(viewerMenuInfo.wkLevel);
  const xp = copy.xp(viewerMenuInfo.xp);

  return (
    <div
      aria-label={copy.label}
      /*
       * Never shrinks and never wraps, like everything else in these two rows.
       * The pages beside it scroll instead — they are in the row that can.
       *
       * The rule on its left is doing real work at 393px. The section row fades
       * its last 28px out as it scrolls, so a half-faded STATS ended up sitting
       * against the XP figure and the two read as one run of text. A divider
       * says the strip is a different kind of thing from the tabs.
       */
      className={`flex shrink-0 items-center gap-x-2 whitespace-nowrap border-l border-line/60 pl-2.5 text-[10px] font-black uppercase tracking-[0.08em] tabular-nums sm:pl-3 sm:text-[11px] ${className}`.trim()}
    >
      {address ? (
        <Link
          href={`/users/${encodeURIComponent(address)}/xp`}
          title={copy.xpTitle}
          className="rounded-md text-foreground transition hover:text-accent"
        >
          {xp}
        </Link>
      ) : (
        <span className="text-foreground">{xp}</span>
      )}

      {/*
        * The levels give way first on a phone. XP is what was asked for in the
        * header and it is the number that moves daily; a level a member already
        * knows can wait for the width that fits it, and 393px is the narrowest
        * screen in the family.
        */}
      {uk && stream ? (
        <Link
          href={ladderBoardPath(stream)}
          translate="no"
          title={copy.umakumaLevelTitle(stream, level!)}
          className={badgeClassName}
        >
          {uk}
        </Link>
      ) : null}

      {/*
        * WaniKani's board is the home page, so this one link leaves for an
        * address that is not a page of its own - see `WANIKANI_BOARD_HREF`.
        * Unlike the UmaKuma badge it needs no address of the member's: the
        * board is the whole household and every row on it is public.
        */}
      {wk ? (
        <Link
          href={WANIKANI_BOARD_HREF}
          translate="no"
          title={copy.wanikaniLevelTitle(viewerMenuInfo.wkLevel!)}
          className={badgeClassName}
        >
          {wk}
        </Link>
      ) : null}

      {/*
        * What this member's stages are called, and the way in to the page that
        * reads the whole theme out. It gives way with the levels rather than
        * with the XP: a name is wider than a badge, and the strip has one line
        * at 393px like everything else in these two rows.
        *
        * Only ever a link. Unlike XP there is nothing worth printing when
        * there is no address to send them to - the name alone answers a
        * question nobody asked, and the point of putting it here was the door.
        */}
      {address && viewerMenuInfo.themeName ? (
        <Link
          href={`/users/${encodeURIComponent(address)}/theme`}
          title={copy.themeTitle(viewerMenuInfo.themeName)}
          className="hidden max-w-[9rem] truncate rounded-md text-foreground/60 transition hover:text-accent sm:inline-block"
        >
          {viewerMenuInfo.themeName}
        </Link>
      ) : null}
    </div>
  );
}
