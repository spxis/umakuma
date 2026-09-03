import { notFound } from "next/navigation";

import AutoListSections from "@/app/shared/AutoListSections";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { fetchFollowedLiveKeys } from "@/lib/studyListShares";

import { ListsPageShell, loadListsPage } from "../listsPageShell";

type PageProps = { params: Promise<{ nickname: string }> };

/**
 * The lists UmaKuma keeps: JLPT levels, school grades and WaniKani levels.
 *
 * Only the member sees these, because the page marks the ones they follow.
 */
export default async function AutoListsPage({ params }: PageProps) {
  const { nickname } = await params;
  const page = await loadListsPage(nickname);
  if (!page.canEdit) {
    notFound();
  }

  const followedLive = await fetchFollowedLiveKeys(page.accountId);

  return (
    <ListsPageShell frame={page.frame} title={STUDY_LIST_COPY.liveListsHeading} subtitle={STUDY_LIST_COPY.liveListsBlurb}>
      <AutoListSections followedKeys={followedLive} />
    </ListsPageShell>
  );
}
