import { describe, expect, it } from "vitest";

import { ACCOUNT_APPROVAL } from "./accountApproval";
import { ACCOUNT_VISIBILITY } from "./accountVisibility";
import { listableTo, viewerKind } from "./accountListing";

const account = (
  visibility: string | null,
  approvalStatus: string | null,
  id = "a",
  disabledAt: Date | null = null,
) => ({
  id,
  visibility,
  approvalStatus,
  disabledAt,
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

  /*
   * Disabling has to be visible from outside, or it is a note rather than an
   * act: an approved, public member who has been switched off leaves the board
   * for everybody, the admin included.
   */
  it("keeps a disabled account off every list, approved and public though it is", () => {
    const rows = [
      account(ACCOUNT_VISIBILITY.public, ACCOUNT_APPROVAL.approved, "a", new Date("2026-09-04T00:00:00Z")),
    ];
    expect(listableTo(rows, "admin")).toHaveLength(0);
    expect(listableTo(rows, "member")).toHaveLength(0);
    expect(listableTo(rows, "anonymous")).toHaveLength(0);
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

/*
 * An admin sees private members everywhere and had no way to check what an
 * ordinary member or a stranger sees - which is the only way to answer "is
 * this person actually hidden". The preview answers it, and the whole of its
 * safety is that it only ever removes.
 */
describe("an admin previewing as somebody else", () => {
  it("drops an admin to a stranger, and to a member", () => {
    expect(viewerKind({ isAdmin: true, hasAccount: true, previewAs: "public" })).toBe("anonymous");
    expect(viewerKind({ isAdmin: true, hasAccount: true, previewAs: "member" })).toBe("member");
  });

  it("leaves an admin as an admin when nothing is asked for", () => {
    expect(viewerKind({ isAdmin: true, hasAccount: true })).toBe("admin");
    expect(viewerKind({ isAdmin: true, hasAccount: true, previewAs: null })).toBe("admin");
  });

  /*
   * The value comes off the query string, so anything can arrive. There is no
   * upward value to ask for and a nonsense one is ignored rather than obeyed.
   */
  it("cannot be used to climb", () => {
    expect(viewerKind({ isAdmin: true, hasAccount: true, previewAs: "admin" })).toBe("admin");
    expect(viewerKind({ isAdmin: true, hasAccount: true, previewAs: "root" })).toBe("admin");
    expect(viewerKind({ isAdmin: true, hasAccount: true, previewAs: "" })).toBe("admin");
  });

  /* And it is not a way in for anybody else. A member asking to be an admin
     is still a member; a stranger asking is still a stranger. */
  it("is ignored entirely for anyone who is not an admin", () => {
    expect(viewerKind({ isAdmin: false, hasAccount: true, previewAs: "admin" })).toBe("member");
    expect(viewerKind({ isAdmin: false, hasAccount: false, previewAs: "member" })).toBe("anonymous");
    expect(viewerKind({ isAdmin: false, hasAccount: false, previewAs: "public" })).toBe("anonymous");
  });
});
