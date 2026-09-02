import type { Metadata } from "next";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import AutoListSections from "@/app/shared/AutoListSections";

/* The header reads who is asking, so the page cannot be prerendered. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lists — UmaKuma",
  description: "Kanji lists that keep themselves: every JLPT level, every Japanese school grade, every WaniKani level.",
};

/**
 * The auto lists, all of them, for anybody.
 *
 * The same sections a member sees on their own Lists page, which is where
 * a member goes for these; this is the way in for somebody who has no page
 * of their own yet.
 */
export default function AutoListsIndexPage() {
  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <div className="mx-auto max-w-5xl space-y-4 pb-8">
        <header>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">{STUDY_LIST_COPY.liveListsHeading}</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/70">{STUDY_LIST_COPY.liveListsBlurb}</p>
        </header>
        <AutoListSections />
      </div>
    </div>
  );
}
