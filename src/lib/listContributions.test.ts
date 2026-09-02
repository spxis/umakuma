import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "./domainConstants";
import {
  LIST_CONTRIBUTIONS,
  PROPOSAL_ACTIONS,
  applyProposal,
  contributionOutcome,
  meaningfulProposals,
} from "./listContributions";
import type { StudyListItemRef } from "./studyListRules";

const kanji = (key: string): StudyListItemRef => ({ kind: LIST_ITEM_KINDS.kanji, key });
const held = [kanji("日"), kanji("月")];

describe("what a change to somebody else's list becomes", () => {
  it("applies straight away on an open list, for an addition", () => {
    expect(contributionOutcome({ contributions: LIST_CONTRIBUTIONS.open, action: PROPOSAL_ACTIONS.add, isOwner: false })).toBe("apply");
  });

  /* Open to additions is not open to being emptied. */
  it("proposes a removal even on an open list", () => {
    expect(contributionOutcome({ contributions: LIST_CONTRIBUTIONS.open, action: PROPOSAL_ACTIONS.remove, isOwner: false })).toBe("propose");
  });

  it("proposes everything on a locked list, and applies everything for the owner", () => {
    expect(contributionOutcome({ contributions: LIST_CONTRIBUTIONS.closed, action: PROPOSAL_ACTIONS.add, isOwner: false })).toBe("propose");
    expect(contributionOutcome({ contributions: LIST_CONTRIBUTIONS.closed, action: PROPOSAL_ACTIONS.remove, isOwner: true })).toBe("apply");
  });
});

describe("approving a proposal", () => {
  it("adds after what is there, or takes out", () => {
    expect(applyProposal(held, { action: PROPOSAL_ACTIONS.add, item: kanji("火") }).map((i) => i.key)).toEqual(["日", "月", "火"]);
    expect(applyProposal(held, { action: PROPOSAL_ACTIONS.remove, item: kanji("日") }).map((i) => i.key)).toEqual(["月"]);
  });

  it("drops a proposal that would decide nothing", () => {
    const kept = meaningfulProposals(held, [
      { action: PROPOSAL_ACTIONS.add, item: kanji("日") },
      { action: PROPOSAL_ACTIONS.add, item: kanji("火") },
      { action: PROPOSAL_ACTIONS.add, item: kanji("火") },
      { action: PROPOSAL_ACTIONS.remove, item: kanji("水") },
      { action: PROPOSAL_ACTIONS.remove, item: kanji("月") },
    ]);
    expect(kept.map((p) => `${p.action}:${p.item.key}`)).toEqual(["add:火", "remove:月"]);
  });
});
