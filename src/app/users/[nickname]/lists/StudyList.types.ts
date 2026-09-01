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
 * by source rather than by the characters, so it takes the whole list and not
 * the preview this card had room for.
 */
export type ListCard = {
  id: string;
  name: string;
  characters: string[];
  /** The true size, which for a tagged list exceeds what the card previews. */
  count: number;
  updatedAt: string | null;
  tag: TaggedListSummary["tag"] | null;
};

export type StudyListCardProps = {
  card: ListCard;
  /** Condensed one-line form rather than the browsing card. */
  rows: boolean;
  accountId: string;
  practiceHref: string;
  /** Only the member whose lists these are may rename or delete one. */
  canEdit: boolean;
  onDelete: () => void;
  /** Reported upward so the page keeps the new name without a round trip. */
  onRenamed: (name: string) => void;
};
