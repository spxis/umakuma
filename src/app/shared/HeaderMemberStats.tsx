import Link from "next/link";

import type { ViewerMenuInfo } from "@/app/users/[nickname]/UserDashboardTabs.types";
import { unLevelBadge, wkLevelBadge } from "@/lib/levelBadge";

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
  const uk = unLevelBadge(viewerMenuInfo.ukLevel);
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
      {uk ? (
        <span
          translate="no"
          title={copy.umakumaLevelTitle(viewerMenuInfo.ukLevel!)}
          className="hidden text-foreground/60 sm:inline"
        >
          {uk}
        </span>
      ) : null}

      {wk ? (
        <span
          translate="no"
          title={copy.wanikaniLevelTitle(viewerMenuInfo.wkLevel!)}
          className="hidden text-foreground/60 sm:inline"
        >
          {wk}
        </span>
      ) : null}
    </div>
  );
}
