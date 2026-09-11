import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { heldNow, TASK_LEASE_MS } from "@/lib/ticketClaims";
import { isWaitingTicket, TICKET_STATUSES } from "@/lib/tickets";

describe("what the release page counts", () => {
  const page = readFileSync("src/app/admin/releases/page.tsx", "utf8");

  /* John, reading the page: "Why is nothing planned? Planned is what's taken
     from the queue?" Nothing was planned because the counters read the file,
     and the file holds only releases - all 480 shipped, none owned - so they
     could report nothing but zero while 157 tickets waited in a tab beside
     them. */
  it("counts the queue from the board, not from the release file", () => {
    expect(page).toContain("tickets.filter((ticket) => isWaitingTicket(ticket.status))");
    expect(page).not.toContain("value={totals.planned}");
    expect(page).not.toContain("value={totals.inProgress}");
  });

  /* In progress is a claim, not a status, and a claim has a lease. Counting
     the column kept a dead session's ticket In progress here for ever while
     `pnpm task` printed STALE beside the same row and would have granted a
     claim on it - two boards, two answers. */
  it("counts in progress by the lease, the way the CLI board does", () => {
    expect(page).toContain("tickets.filter((ticket) => heldNow(ticket))");
    expect(page).not.toContain("ticket.status === TICKET_STATUSES.inProgress");
  });

  it("still counts what has shipped from the file, which is what holds it", () => {
    expect(page).toContain("value={shipped.length}");
    /* And nothing else from it: the four tabs that read planned, backlog and
       cancelled work out of a file that holds shipped entries only are gone. */
    expect(page).not.toContain("splitPlannedByProgress");
    expect(page).not.toContain("FEATURE_STATUSES.backlogged");
  });
});

describe("waiting", () => {
  /* `filed` is the first board's word for open, and rows still carry it. */
  it("is either word the board uses for not started", () => {
    expect(isWaitingTicket(TICKET_STATUSES.open)).toBe(true);
    expect(isWaitingTicket(TICKET_STATUSES.filed)).toBe(true);
  });

  it("is not held, shipped or declined", () => {
    for (const status of [TICKET_STATUSES.inProgress, TICKET_STATUSES.shipped, TICKET_STATUSES.declined]) {
      expect(isWaitingTicket(status)).toBe(false);
    }
  });
});

describe("the tickets tab", () => {
  const tabs = readFileSync("src/app/admin/releases/ReleaseTimelineTabs.tsx", "utf8");

  /* John: "Tickets should represent what's left to do." It counted every row
     the board has ever held - 157, of which 127 had shipped and 4 were
     declined - so the number said the same thing forever. */
  it("counts what is outstanding, not the board's whole history", () => {
    /* Unfinished is read through the lease: waiting, held now, or a stale
       hold somebody walked away from. */
    expect(tabs).toContain("tickets.filter((ticket) => isUnfinished(ticket))");
    expect(tabs).toContain("${remaining.length}");
    expect(tabs).not.toContain("${tickets.length}");
  });

  /* The list still shows them all: a declined row is kept so the same thing is
     not asked for twice. It is the count that means outstanding. */
  it("still hands the whole board to the list below it", () => {
    expect(tabs).toContain("<TicketBoard initialTickets={tickets} />");
  });
});

describe("a hold, as the page reads it", () => {
  const now = Date.parse("2026-09-11T12:00:00Z");
  /* A Ticket carries claimedAt as the ISO string the API returned, not a Date. */
  it("is in progress inside the lease", () => {
    expect(heldNow({ claimedBy: "umakuma-b6", claimedAt: "2026-09-11T11:00:00.000Z" }, now)).toBe(true);
  });

  it("is not in progress once the lease has lapsed, whatever the column says", () => {
    const lapsed = new Date(now - TASK_LEASE_MS - 1).toISOString();
    expect(heldNow({ claimedBy: "umakuma-b6", claimedAt: lapsed }, now)).toBe(false);
  });

  it("is not in progress with a status and no holder", () => {
    expect(heldNow({ claimedBy: null, claimedAt: null }, now)).toBe(false);
  });
});
