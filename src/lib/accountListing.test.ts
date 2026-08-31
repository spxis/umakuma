import { describe, expect, it } from "vitest";

import { ACCOUNT_APPROVAL } from "./accountApproval";
import { ACCOUNT_VISIBILITY } from "./accountVisibility";
import { listableTo, viewerKind } from "./accountListing";

const account = (visibility: string | null, approvalStatus: string | null, id = "a") => ({
  id,
  visibility,
  approvalStatus,
});

describe("listableTo", () => {
  /*
   * The pairing that matters: the two gates are independent, so passing one is
   * not enough. A member who chose Public while still waiting must not be
   * listed, or approval would mean nothing.
   */
  it("hides a pending member however visible they chose to be", () => {
    const rows = [account(ACCOUNT_VISIBILITY.public, ACCOUNT_APPROVAL.pending)];
    expect(listableTo(rows, "member")).toHaveLength(0);
    expect(listableTo(rows, "anonymous")).toHaveLength(0);
  });

  it("hides an approved member who chose to be private", () => {
    const rows = [account(ACCOUNT_VISIBILITY.private, ACCOUNT_APPROVAL.approved)];
    expect(listableTo(rows, "member")).toHaveLength(0);
  });

  it("lists an approved member to the audience they chose", () => {
    const rows = [account(ACCOUNT_VISIBILITY.family, ACCOUNT_APPROVAL.approved)];
    expect(listableTo(rows, "member")).toHaveLength(1);
    expect(listableTo(rows, "anonymous")).toHaveLength(0);
  });

  it("lists a public member to a signed-out visitor", () => {
    const rows = [account(ACCOUNT_VISIBILITY.public, ACCOUNT_APPROVAL.approved)];
    expect(listableTo(rows, "anonymous")).toHaveLength(1);
  });

  /*
   * The deploy-day case. Every existing account has null in both columns, and
   * they were all on the leaderboard the day before.
   */
  it("keeps every account that predates these columns on the board", () => {
    const rows = [account(null, null, "john"), account(null, null, "emi")];
    expect(listableTo(rows, "member")).toHaveLength(2);
    // Including for signed-out visitors, who could already see them.
    expect(listableTo(rows, "anonymous")).toHaveLength(2);
  });

  it("shows an admin everyone, including those still waiting", () => {
    const rows = [
      account(ACCOUNT_VISIBILITY.private, ACCOUNT_APPROVAL.approved, "a"),
      account(ACCOUNT_VISIBILITY.public, ACCOUNT_APPROVAL.pending, "b"),
    ];
    // Visible to an admin, but a pending account is still not approved.
    expect(listableTo(rows, "admin").map((row) => row.id)).toEqual(["a"]);
  });

  it("keeps a rejected account off every list", () => {
    const rows = [account(ACCOUNT_VISIBILITY.public, ACCOUNT_APPROVAL.rejected)];
    expect(listableTo(rows, "admin")).toHaveLength(0);
    expect(listableTo(rows, "member")).toHaveLength(0);
  });
});

describe("viewerKind", () => {
  it("treats a signed-in visitor with no account as a stranger", () => {
    expect(viewerKind({ isAdmin: false, hasAccount: false })).toBe("anonymous");
  });

  it("recognizes a member and an admin", () => {
    expect(viewerKind({ isAdmin: false, hasAccount: true })).toBe("member");
    expect(viewerKind({ isAdmin: true, hasAccount: false })).toBe("admin");
  });
});
