import Link from "next/link";

import { xpRank, xpRankBadge } from "@/lib/xp/xpRanks";

/**
 * A rank, written the one way it is written everywhere.
 *
 * Before this the site said "Rookie" in some places, "L1 Rookie" in others and
 * "Rank 1: Rookie" in a third, and only the chart linked it. Two problems, one
 * fix: the arrangement is decided once here, and the name is a door wherever
 * it appears - a rank is a place, and a surface that prints it flatly makes
 * the reader hunt the chart for a page that was one word away.
 *
 * **To change how every rank on the site reads, change `ORDER` below.** That
 * is the whole of it: `badge-first` gives `L1 Rookie`, `name-first` gives
 * `Rookie (L1)`. Nothing else needs touching, which is the point of the
 * component existing rather than each surface arranging its own.
 *
 * The badge comes from `xpRankBadge`, never a typed `L1` - `levelBadge`'s own
 * test greps the source and fails on one.
 *
 * The one deliberate exception is the ladder chart, which is a table with a
 * column of its own for the badge. Its row still reads left to right as this
 * does; it just cannot put them in one cell without losing the alignment that
 * makes a hundred rows scannable.
 */
const ORDER: "badge-first" | "name-first" = "badge-first";

export default function RankName({
  level,
  linked = true,
  className = "",
}: {
  level: number;
  /** Off only where the surrounding text is already the link. */
  linked?: boolean;
  className?: string;
}) {
  const name = xpRank(level).name;
  const badge = (
    <span translate="no" className="tabular-nums text-foreground/60">
      {xpRankBadge(level)}
    </span>
  );

  const inner =
    ORDER === "badge-first" ? (
      <>
        {badge} {name}
      </>
    ) : (
      <>
        {name} ({badge})
      </>
    );

  if (!linked) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <Link href={`/xp/rank/${level}`} className={`hover:text-accent hover:underline ${className}`.trim()}>
      {inner}
    </Link>
  );
}
