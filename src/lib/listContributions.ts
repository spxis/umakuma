import { mergeListItems, withoutListItems } from "@/app/shared/mergeListItems";
import { listItemId, type StudyListItemRef } from "./studyListRules";

/**
 * Changing a list that is not yours.
 *
 * An owner may open a list so anyone who can see it may add to it; on a
 * locked list the same act becomes a proposal the owner decides. Removal is
 * always a proposal from anybody but the owner - a list open to additions is
 * not a list open to being emptied. These are the rules as maths, so the
 * route and the page agree and a test can say so.
 */

export const LIST_CONTRIBUTIONS = { closed: "closed", open: "open" } as const;
export type ListContributions = (typeof LIST_CONTRIBUTIONS)[keyof typeof LIST_CONTRIBUTIONS];
export const LIST_CONTRIBUTION_VALUES = [LIST_CONTRIBUTIONS.closed, LIST_CONTRIBUTIONS.open] as const;
export const LIST_CONTRIBUTION_DISPLAY: Record<ListContributions, { label: string; description: string }> = {
  [LIST_CONTRIBUTIONS.closed]: { label: "Locked", description: "Others propose changes; you decide." },
  [LIST_CONTRIBUTIONS.open]: { label: "Open", description: "Anyone who can see it may add to it." },
};

export const PROPOSAL_ACTIONS = { add: "add", remove: "remove" } as const;
export type ProposalAction = (typeof PROPOSAL_ACTIONS)[keyof typeof PROPOSAL_ACTIONS];

export type Proposal = { action: ProposalAction; item: StudyListItemRef };

/** What a contribution from somebody who is not the owner becomes. */
export function contributionOutcome(input: {
  contributions: ListContributions;
  action: ProposalAction;
  isOwner: boolean;
}): "apply" | "propose" {
  if (input.isOwner) return "apply";
  return input.contributions === LIST_CONTRIBUTIONS.open && input.action === PROPOSAL_ACTIONS.add ? "apply" : "propose";
}

/** The list after a proposal is approved: the item added after the rest, or taken out. */
export function applyProposal(items: StudyListItemRef[], proposal: Proposal): StudyListItemRef[] {
  return proposal.action === PROPOSAL_ACTIONS.add
    ? mergeListItems(items, [proposal.item])
    : withoutListItems(items, [proposal.item]);
}

/**
 * Proposals worth keeping: an addition of something already there, or a
 * removal of something absent, would ask the owner to decide nothing.
 */
export function meaningfulProposals(items: StudyListItemRef[], proposals: Proposal[]): Proposal[] {
  const held = new Set(items.map(listItemId));
  const seen = new Set<string>();
  return proposals.filter((proposal) => {
    const id = `${proposal.action}:${listItemId(proposal.item)}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return proposal.action === PROPOSAL_ACTIONS.add ? !held.has(listItemId(proposal.item)) : held.has(listItemId(proposal.item));
  });
}
