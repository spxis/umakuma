import { notFound } from "next/navigation";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { fetchFollowedLists } from "@/lib/studyListShares";

import FollowedLists from "../FollowedLists";
import { ListsPageShell, loadListsPage } from "../listsPageShell";

type PageProps = { params: Promise<{ nickname: string }> };

/** Lists other members keep and this one reads. Theirs to see, nobody else's. */
export default async function FollowedListsPage({ params }: PageProps) {
  const { nickname } = await params;
  const page = await loadListsPage(nickname);
  if (!page.canEdit) {
    notFound();
  }

  const followed = await fetchFollowedLists(page.accountId);

  return (
    <ListsPageShell frame={page.frame} title={STUDY_LIST_COPY.followedHeading} subtitle={STUDY_LIST_COPY.followedBlurb}>
      {followed.length > 0 ? (
        <FollowedLists lists={followed} accountId={page.accountId} />
      ) : (
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-foreground/70">
          {STUDY_LIST_COPY.followedEmpty}
        </p>
      )}
    </ListsPageShell>
  );
}
