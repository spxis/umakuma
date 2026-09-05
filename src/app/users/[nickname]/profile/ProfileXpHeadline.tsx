import Link from "next/link";

import { XP_RANKS, xpStanding } from "@/lib/xp/xpCurve";
import { xpRank, xpRankBadge } from "@/lib/xp/xpRanks";

import { PROFILE_XP_HEADLINE_COPY as copy } from "./profileCopy";

/**
 * The XP total, the rung it bought, and what is left - in the page header.
 *
 * `XpRankPanel` further down already says all of this, with a bar and the
 * rank's names in nine other traditions. That card is read on purpose; this
 * line is read at a glance, and the number a member checks most often was
 * three screens below the fold on their own profile.
 *
 * The rank is derived from the XP rather than read from `Account.xpLevel`, for
 * the reason the panel gives: the stored level is materialised, this page puts
 * it next to the total it came from, and a disagreement between the two would
 * be visible here first.
 *
 * A link to the XP board, because the two questions this line raises - what
 * does the next rung cost, who else is up here - are both answered there.
 */
export default function ProfileXpHeadline({ xp }: { xp: number }) {
  const standing = xpStanding(xp);
  const rank = xpRank(standing.level);
  const atTop = standing.level >= XP_RANKS;
  const next = atTop ? null : xpRank(standing.level + 1);

  return (
    <Link
      href="/xp"
      title={copy.title(standing.level, rank.name, xp)}
      className="rounded-xl border border-line bg-surface-muted/40 px-3 py-2 text-right transition hover:border-accent"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {copy.label}
      </p>
      <p className="text-base font-black tabular-nums leading-tight text-foreground">
        {copy.total(xp)}
      </p>
      <p className="text-xs font-black leading-tight text-accent">
        {copy.rank(xpRankBadge(standing.level), rank.name)}
      </p>
      <p className="text-[11px] font-semibold tabular-nums leading-tight text-foreground/60">
        {next ? copy.toNext(standing.toNext, next.name) : copy.atTop}
      </p>
    </Link>
  );
}
