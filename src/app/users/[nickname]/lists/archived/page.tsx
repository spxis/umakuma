import { notFound } from "next/navigation";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { fetchStudyLists } from "@/lib/studyLists";

import ArchivedLists from "../ArchivedLists";
import { ListsPageShell, loadListsPage } from "../listsPageShell";

type PageProps = { params: Promise<{ nickname: string }> };

/** Lists the member has put away. Kept, not deleted, and only they see them. */
export default async function ArchivedListsPage({ params }: PageProps) {
  const { nickname } = await params;
  const page = await loadListsPage(nickname);
  if (!page.canEdit) {
    notFound();
  }

  const archived = await fetchStudyLists(page.accountId, true);

  return (
    <ListsPageShell frame={page.frame} title={STUDY_LIST_COPY.archivedHeading} subtitle={STUDY_LIST_COPY.archivedBlurb}>
      {archived.length > 0 ? (
        <ArchivedLists lists={archived} accountId={page.accountId} owner={page.userKey} />
      ) : (
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-foreground/70">
          {STUDY_LIST_COPY.archivedEmpty}
        </p>
      )}
    </ListsPageShell>
  );
}
