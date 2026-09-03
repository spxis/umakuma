import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { fetchStudyLists } from "@/lib/studyLists";
import { fetchTaggedListSummaries } from "@/lib/studySubjectTags";

import ImportFromTextButton from "./ImportFromTextButton";
import MergeListsButton from "./MergeListsButton";
import NewListButton from "./NewListButton";
import StudyListCards from "./StudyListCards";
import { ListsPageShell, loadListsPage } from "./listsPageShell";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

/**
 * The lists a member built, with a preview of what is in each.
 *
 * The page a parent opens to see what a week covers, which is why the cards
 * show the characters rather than a count. The auto lists, the ones the member
 * follows and the ones they have put away were stacked underneath this and are
 * now their own pages, named in the header's second row.
 */
export default async function UserListsPage({ params }: PageProps) {
  const { nickname } = await params;
  const page = await loadListsPage(nickname);

  /*
   * Both kinds, together. Trouble and Favourites are the two lists every
   * member has, and the page that is meant to show a member their lists was
   * the one place they did not appear.
   */
  const [lists, taggedLists] = await Promise.all([
    fetchStudyLists(page.accountId),
    fetchTaggedListSummaries(page.accountId),
  ]);

  return (
    <ListsPageShell
      frame={page.frame}
      title={STUDY_LIST_COPY.heading}
      subtitle={STUDY_LIST_COPY.subtitle}
      actions={
        page.canEdit ? (
          <span className="flex flex-wrap items-center gap-2">
            <ImportFromTextButton accountId={page.accountId} />
            <MergeListsButton accountId={page.accountId} lists={lists} />
            <NewListButton accountId={page.accountId} />
          </span>
        ) : null
      }
    >
      <StudyListCards
        lists={lists}
        taggedLists={taggedLists}
        accountId={page.accountId}
        owner={page.userKey}
        practicePath={page.practicePath}
        canEdit={page.canEdit}
      />
    </ListsPageShell>
  );
}
