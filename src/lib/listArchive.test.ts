import { describe, expect, it } from "vitest";

import { LIST_VISIBILITIES } from "./domainConstants";
import { acceptsChanges, endOfListOutcome } from "./listArchive";

const alone = { visibility: LIST_VISIBILITIES.private, subscribers: 0, copies: 0, pendingProposals: 0 };

describe("when an owner is done with a list", () => {
  it("deletes a private list nobody else has seen", () => {
    expect(endOfListOutcome(alone)).toBe("delete");
  });

  /* A link that dies in somebody's hand is worse than a list that says it is finished. */
  it("archives a list that is shared, followed, copied or has suggestions waiting", () => {
    expect(endOfListOutcome({ ...alone, visibility: LIST_VISIBILITIES.unlisted })).toBe("archive");
    expect(endOfListOutcome({ ...alone, visibility: LIST_VISIBILITIES.public })).toBe("archive");
    expect(endOfListOutcome({ ...alone, subscribers: 1 })).toBe("archive");
    expect(endOfListOutcome({ ...alone, copies: 2 })).toBe("archive");
    expect(endOfListOutcome({ ...alone, pendingProposals: 1 })).toBe("archive");
  });

  it("closes an archived list to change until it is restored", () => {
    expect(acceptsChanges(null)).toBe(true);
    expect(acceptsChanges(new Date())).toBe(false);
    expect(acceptsChanges("2026-09-02T00:00:00Z")).toBe(false);
  });
});
