import { notFound } from "next/navigation";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { listMapSets } from "@/lib/mapCustomSetsServer";

import { ListsPageShell, loadListsPage } from "../listsPageShell";
import YourMapSets from "../YourMapSets";

type PageProps = { params: Promise<{ nickname: string }> };

/**
 * The custom Map sets a member keeps: theirs to see, change and remove, and
 * nobody else's. A set is chosen to play from the Map lobby's Play row; this
 * is where it is looked after.
 */
export default async function YourMapsPage({ params }: PageProps) {
  const { nickname } = await params;
  const page = await loadListsPage(nickname);
  if (!page.canEdit) {
    notFound();
  }

  const sets = await listMapSets(page.accountId);

  return (
    <ListsPageShell frame={page.frame} title={STUDY_LIST_COPY.mapsHeading} subtitle={STUDY_LIST_COPY.mapsBlurb}>
      <YourMapSets accountId={page.accountId} owner={page.userKey} initialSets={sets} />
    </ListsPageShell>
  );
}
