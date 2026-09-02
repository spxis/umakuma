import type { ListMetaFacts } from "@/app/shared/listMeta.types";
import type { ListVisibility } from "@/lib/domainConstants";
import type { StudyListItemRef } from "@/lib/studyListRules";
import type { TaggedListSummary } from "@/lib/studySubjectTags";

/**
 * One card, whichever kind of list it is describing.
 *
 * Trouble and Favourites are lists in every sense a member cares about - named,
 * full of subjects, the thing you practise from - but they are tag rows rather
 * than saved lists, so this page did not know about them and somebody looking
 * at their lists could not see the two they had actually built. They are folded
 * into the same shape here: what differs is that they cannot be renamed or
 * deleted, they open the panel instead, and their practice sheet is addressed
 * by source rather than by the items, so it takes the whole list and not the
 * preview this card had room for.
 */
export type ListCard = {
  id: string;
  name: string;
  /** What the list holds, in order; a tagged list carries a preview of kanji items. */
  items: StudyListItemRef[];
  /** The true size, which for a tagged list exceeds what the card previews. */
  count: number;
  updatedAt: string | null;
  /** The rest of what a list says about itself; a tagged list has none of it. */
  meta: ListMetaFacts | null;
  tag: TaggedListSummary["tag"] | null;
  /** The list's own page; a tagged list opens the panel instead. */
  href: string | null;
  visibility: ListVisibility | null;
};

export type StudyListCardProps = {
  card: ListCard;
  /** Condensed one-line form rather than the browsing card. */
  rows: boolean;
  accountId: string;
  /** Null for the Burned list: there is nothing to practise in what you know. */
  practiceHref: string | null;
  /** Only the member whose lists these are may rename or delete one. */
  canEdit: boolean;
  onDelete: () => void;
  /** Reported upward so the page keeps the new name without a round trip. */
  onRenamed: (name: string) => void;
  /** The same, for what the list now holds after an edit. */
  onItemsChanged: (items: StudyListItemRef[]) => void;
};

export type StudyListItemEditorProps = {
  /** What the list holds now; the editor works on its own copy. */
  items: StudyListItemRef[];
  saving: boolean;
  onSave: (items: StudyListItemRef[]) => void;
  onCancel: () => void;
};

export type ListSort = "updated" | "name" | "size";
export const LIST_SORTS: readonly ListSort[] = ["updated", "name", "size"];
