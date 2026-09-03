import type { Metadata } from "next";
import { getServerSession } from "next-auth";

import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { DASHBOARD_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions } from "@/lib/auth";
import {
  groupsForStrokes,
  radicalStrokeCounts,
  radicalsShown,
  readParts,
  readStrokes,
} from "@/lib/radicalBrowser";
import { radicalNameIndex } from "@/lib/radicalNames";
import { runRadicalSearch } from "@/lib/radicalSearchServer";

import RadicalBrowserView from "./RadicalBrowserView";
import { RADICAL_BROWSER_COPY } from "./RadicalBrowser.constants";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Radicals — UmaKuma",
  description: RADICAL_BROWSER_COPY.subtitle,
};

/**
 * The parts kanji are built from, as a page.
 *
 * The radical picker in search asks "which kanji has these parts" from inside
 * a dropdown, which is the right shape for somebody mid-search and the wrong
 * one for somebody who wants to *see* the radicals. This is the stroke
 * browser's layout over the same index: counts along the top, the things
 * themselves below, and the filing column for a member who wants one kept.
 *
 * Public, like the strokes page and the subject pages: it is a fact about the
 * language rather than about a member.
 */
export default async function RadicalsPage({ searchParams }: Props) {
  const query = await searchParams;

  /*
   * One read of the index answers both halves: the groups for the grid and,
   * when something is picked, the kanji that contain all of it. Asking with no
   * parts is the plain page and costs no intersection.
   */
  const chosen = readParts(query.parts);
  const result = await runRadicalSearch(chosen);

  const counts = radicalStrokeCounts(result.groups);
  const strokes = readStrokes(query.strokes, counts.map((entry) => entry.strokes));
  const groups = groupsForStrokes(result.groups, strokes);

  /* Only the radicals on screen need a name; the index is 253 either way. */
  const names = await radicalNameIndex(groups.flatMap((group) => group.radicals));

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
        title={RADICAL_BROWSER_COPY.title}
        subtitle={RADICAL_BROWSER_COPY.subtitle}
        className="mb-3"
      />
      <RadicalBrowserView
        counts={counts}
        groups={groups}
        strokes={strokes}
        shown={radicalsShown(groups)}
        chosen={result.chosen}
        usable={result.usable}
        matches={result.matches}
        totalMatches={result.totalMatches}
        names={Object.fromEntries(names)}
        accountId={viewerMenuInfo?.accountId ?? null}
      />
    </div>
  );
}
