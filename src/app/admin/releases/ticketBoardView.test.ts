import { describe, expect, it } from "vitest";

import { TASK_LEASE_MS } from "@/lib/ticketClaims";
import type { Ticket } from "@/lib/tickets";

import {
  TICKET_BOARD_START,
  filterTickets,
  groupTicketsByLane,
  isUnfinished,
  sortTickets,
  tallyTickets,
  ticketLane,
} from "./ticketBoardView";

const NOW = Date.parse("2026-09-11T12:00:00Z");
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString();

function ticket(overrides: Partial<Ticket> & { id: string }): Ticket {
  return {
    title: overrides.id,
    detail: null,
    area: "admin",
    kind: "feature",
    status: "open",
    filedAs: null,
    requestedBy: null,
    claimedBy: null,
    claimedAt: null,
    priority: null,
    effort: null,
    createdAt: at(48),
    movedAt: at(48),
    ...overrides,
  };
}

const board: Ticket[] = [
  ticket({ id: "held", status: "in_progress", claimedBy: "b6", claimedAt: at(1), movedAt: at(1) }),
  ticket({ id: "stale", status: "in_progress", claimedBy: "dead", claimedAt: new Date(NOW - TASK_LEASE_MS - 1000).toISOString(), movedAt: at(9) }),
  ticket({ id: "waiting", status: "open", movedAt: at(2), priority: "high", effort: "small", createdAt: at(1) }),
  ticket({ id: "filed", status: "filed", movedAt: at(3), area: "games", kind: "bug", requestedBy: "john@example.com" }),
  ticket({ id: "shipped", status: "shipped", filedAs: "x", movedAt: at(4) }),
  ticket({ id: "declined", status: "declined", movedAt: at(5) }),
];

describe("a lane is a status read through the lease", () => {
  it("names the five lanes", () => {
    expect(board.map((row) => ticketLane(row, NOW))).toEqual(["held", "stale", "waiting", "waiting", "shipped", "declined"]);
  });

  it("counts a stale hold as unfinished, and neither closed state", () => {
    expect(board.filter((row) => isUnfinished(row, NOW)).map((row) => row.id)).toEqual(["held", "stale", "waiting", "filed"]);
  });

  it("tallies every lane, zero included", () => {
    expect(tallyTickets(board, NOW)).toEqual({ held: 1, stale: 1, waiting: 2, shipped: 1, declined: 1 });
    expect(tallyTickets([], NOW).held).toBe(0);
  });
});

describe("filtering", () => {
  it("starts on what is unfinished", () => {
    expect(filterTickets(board, TICKET_BOARD_START, NOW).map((row) => row.id)).toEqual(["held", "stale", "waiting", "filed"]);
  });

  it("narrows by lane, kind and area", () => {
    expect(filterTickets(board, { ...TICKET_BOARD_START, lane: "stale" }, NOW).map((row) => row.id)).toEqual(["stale"]);
    expect(filterTickets(board, { ...TICKET_BOARD_START, lane: "all", kind: "bug" }, NOW).map((row) => row.id)).toEqual(["filed"]);
    expect(filterTickets(board, { ...TICKET_BOARD_START, lane: "all", area: "games" }, NOW).map((row) => row.id)).toEqual(["filed"]);
  });

  it("finds words in the title, the detail, the requester and the id", () => {
    expect(filterTickets(board, { ...TICKET_BOARD_START, lane: "all", text: "JOHN@" }, NOW).map((row) => row.id)).toEqual(["filed"]);
    expect(filterTickets(board, { ...TICKET_BOARD_START, lane: "all", text: "ship" }, NOW).map((row) => row.id)).toEqual(["shipped"]);
    expect(filterTickets(board, { ...TICKET_BOARD_START, text: "   " }, NOW)).toHaveLength(4);
  });
});

describe("ordering", () => {
  it("by status reads down the lanes, newest moved first inside each", () => {
    expect(sortTickets(board, "status", NOW).map((row) => row.id)).toEqual(["held", "waiting", "filed", "stale", "shipped", "declined"]);
  });

  it("by quick wins puts the graded row first and the ungraded after", () => {
    expect(sortTickets(board, "quickWins", NOW)[0].id).toBe("waiting");
  });

  it("by moved, newest and oldest", () => {
    expect(sortTickets(board, "moved", NOW)[0].id).toBe("held");
    expect(sortTickets(board, "newest", NOW)[0].id).toBe("waiting");
    expect(sortTickets(board, "oldest", NOW)[0].id).toBe("held");
  });

  it("returns a new array", () => {
    const copy = [...board];
    sortTickets(board, "oldest", NOW);
    expect(board).toEqual(copy);
  });
});

describe("grouping", () => {
  it("groups a mixed filter by lane under the status order, and nothing else", () => {
    const sorted = sortTickets(filterTickets(board, TICKET_BOARD_START, NOW), "status", NOW);
    expect(groupTicketsByLane(sorted, TICKET_BOARD_START, NOW)?.map((group) => [group.lane, group.tickets.length])).toEqual([
      ["held", 1],
      ["waiting", 2],
      ["stale", 1],
    ]);
    expect(groupTicketsByLane(sorted, { ...TICKET_BOARD_START, sort: "newest" }, NOW)).toBeNull();
    expect(groupTicketsByLane(sorted, { ...TICKET_BOARD_START, lane: "waiting" }, NOW)).toBeNull();
  });
});
