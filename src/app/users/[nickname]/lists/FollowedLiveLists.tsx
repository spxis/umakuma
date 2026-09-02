import Link from "next/link";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { LIVE_LISTS_HREF, liveListByKey, liveListHref } from "@/lib/liveLists";

/**
 * The lists nobody owns: the ones this member follows, and the way to the rest.
 *
 * Its own section, because these are not the member's to rename, edit or
 * delete - they are the site's, and they change on their own. Every member
 * gets the way in whether they follow any or not, since a member's Lists page
 * is where somebody would look for them.
 */
export default function FollowedLiveLists({ followedKeys }: { followedKeys: readonly string[] }) {
  const followed = followedKeys.flatMap((key) => {
    const live = liveListByKey(key);
    return live ? [live] : [];
  });

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {STUDY_LIST_COPY.liveListsHeading}
        </h2>
        <Link
          href={LIVE_LISTS_HREF}
          className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent transition hover:underline"
        >
          {STUDY_LIST_COPY.liveSeeAll}
        </Link>
      </div>
      <p className="mb-2 text-xs text-foreground/60">{STUDY_LIST_COPY.liveListsBlurb}</p>
      {followed.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-xs text-foreground/60">
          {STUDY_LIST_COPY.liveGradeBlurb} {STUDY_LIST_COPY.liveJlptBlurb}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {followed.map((live) => (
            <li key={live.key}>
              <Link
                href={liveListHref(live.key)}
                className="inline-flex h-8 items-center rounded-full border border-accent/40 bg-accent/5 px-3 text-xs font-bold text-foreground transition hover:bg-accent/10"
              >
                {live.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
