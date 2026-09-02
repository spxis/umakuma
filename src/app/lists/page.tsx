import type { Metadata } from "next";
import Link from "next/link";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { LIVE_LIST_SOURCES, liveListHref, liveListsBySource, type LiveListSource } from "@/lib/liveLists";

/* The header reads who is asking, so the page cannot be prerendered. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lists — UmaKuma",
  description: "Kanji lists that keep themselves: every JLPT level, every Japanese school grade, every WaniKani level.",
};

/**
 * The lists nobody owns, all of them.
 *
 * Chips rather than cards: there are seventy-two of these and they are all
 * the same shape, so a wall of cards would be a page to scroll rather than a
 * shelf to pick from. Public and static - the set of lists does not change,
 * only what is in each one.
 */
const GROUP_HEADINGS: Record<LiveListSource, { heading: string; blurb: string }> = {
  [LIVE_LIST_SOURCES.jlpt]: { heading: "JLPT", blurb: STUDY_LIST_COPY.liveJlptBlurb },
  [LIVE_LIST_SOURCES.grade]: { heading: "Japanese school grades", blurb: STUDY_LIST_COPY.liveGradeBlurb },
  [LIVE_LIST_SOURCES.wk]: { heading: "WaniKani levels", blurb: STUDY_LIST_COPY.liveWkBlurb },
};

export default function LiveListsIndexPage() {
  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        <header>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">{STUDY_LIST_COPY.liveListsHeading}</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/70">{STUDY_LIST_COPY.liveListsBlurb}</p>
        </header>

        {liveListsBySource().map(({ source, lists }) => (
          <section key={source}>
            <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              {GROUP_HEADINGS[source].heading}
            </h2>
            <p className="mb-2 text-xs text-foreground/60">{GROUP_HEADINGS[source].blurb}</p>
            <ul className="flex flex-wrap gap-1.5">
              {lists.map((list) => (
                <li key={list.key}>
                  <Link
                    href={liveListHref(list.key)}
                    className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-xs font-bold text-foreground/80 transition hover:border-accent/40 hover:bg-surface-muted hover:text-foreground"
                  >
                    {source === LIVE_LIST_SOURCES.wk ? list.level : list.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
