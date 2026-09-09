import { describe, expect, it } from "vitest";

import { TASK_LEASE_MS, claimTask, heldNow, isClaimed, leaseExpired, taskLine } from "./ticketClaims";

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
    /* A holder with no `claimedAt` is a lapsed holder, here and in
       `claimTask` alike - `leaseExpired` treats a missing timestamp as
       expired, so an unclaimable-looking row could never be created by a
       missing clock. The board always writes the two together. */
    expect(taskLine({ ...base, claimedBy: "umakuma-c0", claimedAt: new Date() })).toContain("HELD BY umakuma-c0");
    expect(taskLine({ ...base, claimedBy: "umakuma-c0" })).toContain("STALE umakuma-c0");
    expect(taskLine({ ...base, claimedBy: null })).toContain("WAITING");
  });

  it("marks a bug so it stands out in a list of features", () => {
    expect(taskLine({ ...base, kind: "bug", claimedBy: null })).toContain("BUG");
  });
});

/*
 * The board's line and the board's rules disagreed for the life of the file.
 * `claimTask` honours a six-hour lease and hands a stale ticket to whoever
 * asks; `taskLine` read the holder's name and never the clock, so a dead
 * session was printed as holding work nobody was doing. Two tickets sat that
 * way for four days before anybody tried a claim.
 */
describe("what the board says about a hold", () => {
  const base = { id: "t1", title: "A ticket", kind: "feature", status: "in_progress" };
  const now = Date.UTC(2026, 8, 9, 12, 0, 0);

  it("names the holder while the lease is alive", () => {
    const line = taskLine({ ...base, claimedBy: "someone", claimedAt: new Date(now - 60_000) }, now);

    expect(line).toContain("HELD BY someone");
  });

  it("says STALE once the lease has lapsed, and still names who started it", () => {
    const line = taskLine({ ...base, claimedBy: "a-dead-session", claimedAt: new Date(now - TASK_LEASE_MS - 1000) }, now);

    expect(line).toContain("STALE a-dead-session");
    expect(line).not.toContain("HELD BY");
  });

  it("prints WAITING when nobody has ever held it", () => {
    expect(taskLine({ ...base, status: "open", claimedBy: null, claimedAt: null }, now)).toContain("WAITING");
  });

  /* The tally had the same bug as the line, from the same cause: it counted
     anything not `open` as somebody working. */
  it("counts a lapsed hold as nobody working", () => {
    expect(heldNow({ claimedBy: "gone", claimedAt: new Date(now - TASK_LEASE_MS - 1) }, now)).toBe(false);
    expect(heldNow({ claimedBy: "here", claimedAt: new Date(now - 1000) }, now)).toBe(true);
    expect(heldNow({ claimedBy: null, claimedAt: null }, now)).toBe(false);
  });

  /* The agreement that was missing: whatever the line says, a claim must
     succeed on exactly the tickets it does not call HELD BY. */
  it("agrees with claimTask on every case", () => {
    for (const claimedAt of [new Date(now - 1000), new Date(now - TASK_LEASE_MS - 1), null]) {
      const task = { ...base, claimedBy: "other", claimedAt };
      const grantable = claimTask(task, "me", now).ok;

      expect(taskLine(task, now).includes("HELD BY")).toBe(!grantable);
    }
  });
});
