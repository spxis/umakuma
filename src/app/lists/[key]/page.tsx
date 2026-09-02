import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewerAddress } from "@/app/shared/viewerAddress";
import { authOptions } from "@/lib/auth";
import { liveListByKey } from "@/lib/liveLists";
import { fetchLiveListItems, liveSubscription } from "@/lib/liveListsServer";
import { fetchListSubjectRows } from "@/lib/studySubjectItems";
import { fetchStudyTagRows } from "@/lib/studySubjectTags";

import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";

import LiveListView from "../LiveListView";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ key: string }> };

/**
 * A list nobody owns, at its own address: `/lists/jlpt-n5`.
 *
 * Outside anybody's pages, because it belongs to nobody, and public for the
 * same reason. Its items are found when the page is read rather than stored,
 * so it says today's answer rather than the one somebody saved once.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const live = liveListByKey(decodeURIComponent((await params).key));
  if (!live) return { title: "Lists — UmaKuma" };
  return { title: `${live.name} — UmaKuma`, description: live.description };
}

export default async function LiveListPage({ params }: PageProps) {
  const live = liveListByKey(decodeURIComponent((await params).key));
  if (!live) notFound();

  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const viewerAccountId = viewerMenuInfo?.accountId ?? null;

  const items = await fetchLiveListItems(live);
  const [rows, following, tagRows] = await Promise.all([
    fetchListSubjectRows(items),
    liveSubscription(live.key, viewerAccountId),
    viewerAccountId ? fetchStudyTagRows(viewerAccountId) : Promise.resolve([]),
  ]);

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <LiveListView
        live={{ key: live.key, name: live.name, description: live.description, itemCount: items.length }}
        rows={rows}
        viewer={{
          accountId: viewerAccountId,
          key: viewerAddress(viewerMenuInfo),
          signedIn: Boolean(viewerEmail) || Boolean(viewerMenuInfo),
          following,
        }}
        burnedIds={tagRows.filter((row) => row.burned).map((row) => row.subjectId)}
      />
    </div>
  );
}
