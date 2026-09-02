import { LIST_VISIBILITIES, type ListVisibility } from "./domainConstants";

/**
 * What happens when an owner is done with a list.
 *
 * A private list nobody else has seen is deleted, as it always was. A list
 * with other people attached - shared, followed, copied, with suggestions
 * waiting - is archived instead: closed to change, still readable by everyone
 * who had it, restorable by the owner. Deleting it from under a follower
 * would be a link that dies in somebody's hand; a lock would say "for now"
 * about something that is finished.
 */
export type EndOfListInput = {
  visibility: ListVisibility;
  subscribers: number;
  copies: number;
  pendingProposals: number;
};

export function endOfListOutcome(input: EndOfListInput): "delete" | "archive" {
  if (input.visibility !== LIST_VISIBILITIES.private) return "archive";
  if (input.subscribers > 0 || input.copies > 0 || input.pendingProposals > 0) return "archive";
  return "delete";
}

/** An archived list takes no changes from anyone, owner included, until restored. */
export function acceptsChanges(archivedAt: string | Date | null): boolean {
  return archivedAt === null;
}
