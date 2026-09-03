import { describe, expect, it } from "vitest";

import { TASK_LEASE_MS, claimTask, isClaimed, leaseExpired, taskLine } from "./ticketClaims";

/** A hold made just now, which is the only kind that stops anybody else. */
const fresh = () => new Date();

describe("holding a task", () => {
  it("is held only when somebody is named", () => {
    expect(isClaimed({ claimedBy: "umakuma-04", claimedAt: new Date() })).toBe(true);
    expect(isClaimed({ claimedBy: null, claimedAt: null })).toBe(false);
    expect(isClaimed({ claimedBy: "   ", claimedAt: null })).toBe(false);
  });
});

describe("claiming", () => {
  it("takes a free task", () => {
    expect(claimTask({ claimedBy: null, claimedAt: null }, "umakuma-04")).toEqual({ ok: true, owner: "umakuma-04" });
  });

  /*
   * Two agents building the same thing is the expensive failure, not two
   * agents idle. The second is refused and told who to ask.
   */
  it("refuses one somebody else holds, and says who", () => {
    expect(claimTask({ claimedBy: "umakuma-c0", claimedAt: fresh() }, "umakuma-04")).toEqual({
      ok: false,
      reason: "taken",
      heldBy: "umakuma-c0",
    });
  });

  /*
   * A hold with no expiry is a hold a crashed agent keeps for ever, and the
   * ticket is then unreachable by anybody - worse than the double work the
   * claim was preventing.
   */
  it("lets anybody take a hold nobody has renewed inside the lease", () => {
    const stale = new Date(Date.now() - TASK_LEASE_MS - 1000);
    expect(claimTask({ claimedBy: "umakuma-c0", claimedAt: stale }, "umakuma-04")).toEqual({
      ok: true,
      owner: "umakuma-04",
    });
  });

  /* A row naming a holder with no timestamp is a hold nothing can honour. */
  it("treats a hold with no time on it as expired", () => {
    expect(leaseExpired(null)).toBe(true);
    expect(leaseExpired(fresh())).toBe(false);
  });

  /* Shipped and declined are off the board; there is nothing to pick up. */
  it("refuses a ticket that is already closed", () => {
    expect(claimTask({ claimedBy: null, claimedAt: null, status: "shipped" }, "umakuma-04")).toEqual({
      ok: false,
      reason: "closed",
      heldBy: "shipped",
    });
  });

  /* An agent that has lost track of its own work should not be punished. */
  it("lets the holder re-claim its own", () => {
    expect(claimTask({ claimedBy: "umakuma-04", claimedAt: null }, "umakuma-04")).toEqual({
      ok: true,
      owner: "umakuma-04",
    });
  });

  it("trims the owner, and refuses a name that is only spaces", () => {
    expect(claimTask({ claimedBy: null, claimedAt: null }, "  umakuma-04  ")).toEqual({ ok: true, owner: "umakuma-04" });
    expect(claimTask({ claimedBy: null, claimedAt: null }, "   ").ok).toBe(false);
  });
});

describe("one line per task", () => {
  const base = { id: "abc123", title: "Print without leaving the page", kind: "feature", status: "open" };

  it("leads with who holds it, which is what an agent scans for", () => {
    expect(taskLine({ ...base, claimedBy: "umakuma-c0" })).toContain("HELD BY umakuma-c0");
    expect(taskLine({ ...base, claimedBy: null })).toContain("WAITING");
  });

  it("marks a bug so it stands out in a list of features", () => {
    expect(taskLine({ ...base, kind: "bug", claimedBy: null })).toContain("BUG");
  });
});
