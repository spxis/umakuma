import Link from "next/link";

import { LIVE_LIST_SOURCES, liveListHref, liveListsBySource, type LiveListSource } from "@/lib/liveLists";

import { STUDY_LIST_COPY } from "./studyListCopy";

/**
 * Every auto list, grouped, as chips.
 *
 * One component for the two places they appear - a member's Lists page and
 * the public index - because they were two pages that looked nothing alike
 * showing the same seventy-two lists. Chips rather than cards: they are all
 * the same shape, and a wall of cards would be a page to scroll rather than
 * a shelf to pick from. A list the member follows is marked.
 */
const GROUPS: Record<LiveListSource, { heading: string; blurb: string }> = {
  [LIVE_LIST_SOURCES.jlpt]: { heading: "JLPT", blurb: STUDY_LIST_COPY.liveJlptBlurb },
  [LIVE_LIST_SOURCES.grade]: { heading: "Japanese school grades", blurb: STUDY_LIST_COPY.liveGradeBlurb },
  [LIVE_LIST_SOURCES.wk]: { heading: "WaniKani levels", blurb: STUDY_LIST_COPY.liveWkBlurb },
};

export default function AutoListSections({ followedKeys = [] }: { followedKeys?: readonly string[] }) {
  const followed = new Set(followedKeys);

  return (
    <div className="space-y-4">
      {liveListsBySource().map(({ source, lists }) => (
        <section key={source}>
          <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{GROUPS[source].heading}</h3>
          <p className="mb-2 text-xs text-foreground/60">{GROUPS[source].blurb}</p>
          <ul className="flex flex-wrap gap-1.5">
            {lists.map((list) => {
              const following = followed.has(list.key);
              return (
                <li key={list.key}>
                  <Link
                    href={liveListHref(list.key)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                      following
                        ? "border-accent/40 bg-accent/5 text-foreground hover:bg-accent/10"
                        : "border-line bg-surface text-foreground/80 hover:border-accent/40 hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    {source === LIVE_LIST_SOURCES.wk ? list.level : list.name}
                    {following ? <span className="text-[10px] font-black uppercase tracking-[0.08em] text-accent">★</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
