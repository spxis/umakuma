import Link from "next/link";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { LIST_VISIBILITIES } from "@/lib/domainConstants";
import { listShareHref } from "@/lib/studyListRules";
import type { FollowedList } from "@/lib/studyListShares";

/**
 * The lists an admin put on every member's page: somebody else's, read here
 * and changed only by whoever made them. A shelf above the member's own, so
 * a child opening Lists sees the week's list before the lists they made.
 */
export default function SiteLists({ lists }: { lists: FollowedList[] }) {
  return (
    <section className="mb-5 flex flex-col gap-1" data-testid="site-lists">
      <h2 className="flex items-baseline gap-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
        {STUDY_LIST_COPY.siteHeading}
        <span className="font-semibold text-foreground/60">{lists.length}</span>
      </h2>
      <p className="text-xs text-foreground/60">{STUDY_LIST_COPY.siteBlurb}</p>
      <ul className="flex flex-col divide-y divide-line/60 rounded-2xl border border-line bg-surface px-4">
        {lists.map((list) => (
          <li key={list.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <Link href={listShareHref(list.ownerKey, list.name, LIST_VISIBILITIES.public, null)} className="font-black text-foreground underline-offset-4 hover:underline">
              {list.name}
              <span className="ml-2 text-[11px] font-semibold text-foreground/60">· {list.itemCount}</span>
            </Link>
            <span className="text-xs text-foreground/60">{STUDY_LIST_COPY.siteBy(list.ownerName)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
