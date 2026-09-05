import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isWaitingTicket, TICKET_STATUSES } from "@/lib/tickets";

describe("what the release page counts", () => {
  const page = readFileSync("src/app/admin/releases/page.tsx", "utf8");

  /* John, reading the page: "Why is nothing planned? Planned is what's taken
     from the queue?" Nothing was planned because the counters read the file,
     and the file holds only releases - all 480 shipped, none owned - so they
     could report nothing but zero while 157 tickets waited in a tab beside
     them. */
  it("counts the queue from the board, not from the release file", () => {
    expect(page).toContain("wishes.filter((ticket) => isWaitingTicket(ticket.status))");
    expect(page).toContain("ticket.status === TICKET_STATUSES.inProgress");
    expect(page).not.toContain("value={totals.planned}");
    expect(page).not.toContain("value={totals.inProgress}");
  });

  it("still counts what has shipped from the file, which is what holds it", () => {
    expect(page).toContain("value={totals.shipped}");
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
    expect(tabs).toContain("isWaitingTicket(wish.status) || wish.status === TICKET_STATUSES.inProgress");
    expect(tabs).toContain("${remaining.length}");
    expect(tabs).not.toContain("${wishes.length}");
  });

  /* The list still shows them all: a declined row is kept so the same thing is
     not asked for twice. It is the count that means outstanding. */
  it("still hands the whole board to the list below it", () => {
    expect(tabs).toContain("<TicketBoard initialWishes={wishes} />");
  });
});
