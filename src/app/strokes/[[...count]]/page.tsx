import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { DASHBOARD_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { authOptions } from "@/lib/auth";
import { readParts } from "@/lib/radicalBrowser";
import { radicalDisplayNames } from "@/lib/radicalNames";
import { narrowByRadicals } from "@/lib/radicalSearchServer";
import { narrowBySources, readSources } from "@/lib/kanjiSourceFilters";
import { STROKE_PARAMS, readPage, strokesFromPath, strokesIndexHref } from "@/lib/strokeAddress";
import { isStrokeCount, kanjiByStrokeCount, strokeCounts, strokePage } from "@/lib/strokeBrowser";

import StrokeBrowserView from "../StrokeBrowserView";
import { STROKE_BROWSER_COPY } from "../StrokeBrowser.constants";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ count?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const strokes = strokesFromPath((await params).count);
  if (strokes === undefined || strokes === null) {
    return { title: "Strokes — UmaKuma", description: STROKE_BROWSER_COPY.subtitle };
  }
  return {
    title: `${strokes}-stroke kanji — UmaKuma`,
    description: `Every kanji we teach written in ${strokes} strokes, commonest first.`,
  };
}

/**
 * Kanji by how many strokes they take to write.
 *
 * The site groups kanji by what a learner is doing - their WaniKani level,
 * the year a child is taught them, the JLPT that will test them - and none of
 * those answer the question somebody has with a pen in their hand. The
 * dictionary has known every character's stroke count since the day it was
 * ingested; this is that, as a page.
 *
 * Public, like the maps and the subject pages: it is a fact about the
 * language rather than about a member. A signed-in member gets the filing
 * column, so a character met here can go straight onto one of their lists.
 */
export default async function StrokesPage({ params, searchParams }: Props) {
  const strokes = strokesFromPath((await params).count);
  if (strokes === undefined || (strokes !== null && !isStrokeCount(strokes))) notFound();

  const counts = strokeCounts();
  /* The index has nothing to show of its own, so it opens on the first count. */
  if (strokes === null) redirect(strokesIndexHref(counts));

  const query = await searchParams;
  const all = kanjiByStrokeCount(strokes);

  /*
   * The first filter, and the one John asked for last: which list teaches the
   * character. Common only was a flag of its own until four more questions of
   * exactly the same kind arrived beside it.
   */
  const sources = readSources(query[STROKE_PARAMS.sources]);
  const narrowedBySource = narrowBySources(all, sources);
  const atCount = narrowedBySource.kept;

  /*
   * The second filter, over what the first one left.
   *
   * Everything the grid offers is measured against these kanji rather than
   * against the dictionary, so a part that would empty the page is drawn as a
   * dead end before it is clicked. Nine hundred kanji at one stroke count is
   * a page to scroll; a part cuts it to something a reader can look at.
   */
  const parts = readParts(query[STROKE_PARAMS.parts]);
  const narrowed = narrowByRadicals(atCount.map((entry) => entry.kanji), parts);
  const keptSet = new Set(narrowed.kept);
  const shown = parts.length > 0 ? atCount.filter((entry) => keptSet.has(entry.kanji)) : atCount;
  const { rows, pageCount } = strokePage(shown, readPage(query.page));
  const names = await radicalDisplayNames(narrowed.groups.flatMap((group) => group.radicals));

  const session = await getServerSession(authOptions);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: session?.user?.email?.trim().toLowerCase() ?? null,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <MemberPageHeader
        icon={DASHBOARD_PAGE_HEADERS.jlpt.icon}
        title={STROKE_BROWSER_COPY.title}
        subtitle={STROKE_BROWSER_COPY.subtitle}
        className="mb-3"
      />
      <StrokeBrowserView
        counts={counts}
        strokes={strokes}
        entries={rows}
        page={readPage(query.page)}
        pageCount={pageCount}
        sources={sources}
        sourceCounts={narrowedBySource.counts}
        shownTotal={shown.length}
        total={all.length}
        groups={narrowed.groups}
        chosenParts={narrowed.chosen}
        usableParts={[...narrowed.usable]}
        partNames={Object.fromEntries(names)}
        accountId={viewerMenuInfo?.accountId ?? null}
      />
    </div>
  );
}
