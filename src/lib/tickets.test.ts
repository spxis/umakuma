import { describe, expect, it } from "vitest";

import { FEATURE_KINDS } from "./featureTimeline";
import {
  TICKET_MOVES,
  TICKET_MOVE_TARGETS,
  TICKET_STATUSES,
  TICKET_STATUS_VALUES,
  canMoveTicket,
  isTicketStatus,
  openWishes,
  suggestedEntryId,
  ticketMoveData,
  ticketMoveLabel,
  ticketMoveWhere,
  toTicket,
  type Ticket,
  type TicketStatus,
} from "./tickets";

function row(overrides: Partial<Parameters<typeof toTicket>[0]> = {}) {
  return {
    id: "wish1",
    title: "A thing",
    detail: null,
    area: "games",
    kind: "feature",
    status: "open",
    filedAs: null,
    requestedBy: "john@example.com",
    createdAt: new Date("2026-09-02T10:00:00Z"),
    claimedBy: null,
    claimedAt: null,
    ...overrides,
  };
}

/*
 * Area and kind are plain columns rather than Postgres enums, because both are
 * TypeScript unions that change with the code and a database enum would need a
 * migration every time one did. The cost is that a row can hold a value this
 * build does not know, so the narrowing has to be real.
 */
describe("toTicket", () => {
  it("keeps an area and kind the code still knows", () => {
    const ticket = toTicket(row());
    expect(ticket.area).toBe("games");
    expect(ticket.kind).toBe(FEATURE_KINDS.feature);
  });

  it("drops an area this build no longer has", () => {
    expect(toTicket(row({ area: "gramophones" })).area).toBeNull();
  });

  it("falls back rather than handing a component an unknown kind or status", () => {
    const ticket = toTicket(row({ kind: "chore", status: "archived" }));
    expect(ticket.kind).toBe(FEATURE_KINDS.feature);
    expect(ticket.status).toBe(TICKET_STATUSES.open);
  });

  it("carries no area when nobody chose one", () => {
    expect(toTicket(row({ area: null })).area).toBeNull();
  });
});

describe("isTicketStatus", () => {
  it("accepts the three states and nothing else", () => {
    expect(isTicketStatus("open")).toBe(true);
    expect(isTicketStatus("filed")).toBe(true);
    expect(isTicketStatus("declined")).toBe(true);
    expect(isTicketStatus("toString")).toBe(false);
    expect(isTicketStatus("deleted")).toBe(false);
  });
});

describe("openWishes", () => {
  it("is what an agent has left to file", () => {
    const tickets = [
      toTicket(row({ id: "a", status: "open" })),
      toTicket(row({ id: "b", status: "filed", filedAs: "some-entry" })),
      toTicket(row({ id: "c", status: "declined" })),
    ] satisfies Ticket[];
    expect(openWishes(tickets).map((ticket) => ticket.id)).toEqual(["a"]);
  });
});

describe("suggestedEntryId", () => {
  it("looks like the ids already in the file", () => {
    expect(suggestedEntryId("Read large Japanese numbers in search")).toBe("read-large-japanese-numbers");
  });

  /* Cutting to four words first gave `furigana-toggle-on-the`. */
  it("spends its four words on words that say something", () => {
    expect(suggestedEntryId("Furigana toggle on the reading pages")).toBe("furigana-toggle-reading-pages");
    expect(suggestedEntryId("A weekly email of what the kids studied")).toBe("weekly-email-what-kids");
  });

  it("keeps the small words when they are all there is", () => {
    expect(suggestedEntryId("It is a for and of")).toBe("it-is-a-for");
  });

  it("survives punctuation and a title in another script", () => {
    expect(suggestedEntryId("Dark mode — it doesn't stick!")).toBe("dark-mode-doesn-t");
    expect(suggestedEntryId("装う一組")).toBe("ticket");
  });
});

/*
 * The board's moves are a rule the route asks, not a menu the page draws.
 *
 * The PATCH route validated only that the destination was a status, so any
 * move at all went through - shipped to open, which also cleared the entry
 * the ticket was shipped as and left release:take free to number the same
 * work twice. And "Mark shipped" was a button: it produced a shipped ticket
 * with nothing to point at, the one state the rest of the system says cannot
 * exist. Neither had a test, because the rule lived only in the buttons.
 */
describe("moving a ticket", () => {
  it("never lands on shipped - that is release:take's job", () => {
    for (const from of TICKET_STATUS_VALUES) {
      expect(TICKET_MOVES[from], from).not.toContain(TICKET_STATUSES.shipped);
    }
    expect(Object.values(TICKET_MOVE_TARGETS)).not.toContain(TICKET_STATUSES.shipped);
  });

  it("refuses what the state does not offer", () => {
    expect(canMoveTicket(TICKET_STATUSES.shipped, TICKET_MOVE_TARGETS.open)).toBe(false);
    expect(canMoveTicket(TICKET_STATUSES.shipped, TICKET_MOVE_TARGETS.declined)).toBe(false);
    expect(canMoveTicket(TICKET_STATUSES.open, TICKET_MOVE_TARGETS.open)).toBe(false);
    expect(canMoveTicket(TICKET_STATUSES.declined, TICKET_MOVE_TARGETS.inProgress)).toBe(false);
    expect(canMoveTicket(TICKET_STATUSES.open, TICKET_MOVE_TARGETS.inProgress)).toBe(true);
    expect(canMoveTicket(TICKET_STATUSES.filed, TICKET_MOVE_TARGETS.inProgress)).toBe(true);
    expect(canMoveTicket(TICKET_STATUSES.inProgress, TICKET_MOVE_TARGETS.open)).toBe(true);
    expect(canMoveTicket(TICKET_STATUSES.declined, TICKET_MOVE_TARGETS.open)).toBe(true);
  });

  it("names every move it offers", () => {
    for (const from of TICKET_STATUS_VALUES) {
      for (const to of TICKET_MOVES[from]) {
        expect(ticketMoveLabel(from as TicketStatus, to)).toMatch(/^(Start|Put back|Reopen|Decline)$/);
      }
    }
    expect(ticketMoveLabel(TICKET_STATUSES.declined, TICKET_MOVE_TARGETS.open)).toBe("Reopen");
    expect(ticketMoveLabel(TICKET_STATUSES.inProgress, TICKET_MOVE_TARGETS.open)).toBe("Put back");
  });
});

/*
 * In progress is not a status; it is a claim. The status column written on
 * its own is two fields that can disagree, and did: Start left a ticket in
 * progress that nobody held, so the CLI board - which reads the claim - said
 * WAITING under a page that said In progress; Put back left the holder on a
 * ticket the page called waiting, and `pnpm task claim` refused it for the
 * length of the lease.
 */
describe("what a move writes", () => {
  const now = new Date("2026-09-11T12:00:00Z");

  it("starts a ticket by claiming it, in the same write", () => {
    expect(ticketMoveData(TICKET_MOVE_TARGETS.inProgress, "john@example.com", now)).toEqual({
      status: TICKET_STATUSES.inProgress,
      claimedBy: "john@example.com",
      claimedAt: now,
      filedAs: null,
    });
  });

  it("puts a ticket back, or declines it, by letting go of it", () => {
    for (const to of [TICKET_MOVE_TARGETS.open, TICKET_MOVE_TARGETS.declined]) {
      expect(ticketMoveData(to, "john@example.com", now)).toEqual({
        status: to,
        claimedBy: null,
        claimedAt: null,
        filedAs: null,
      });
    }
  });

  it("writes under the state it planned from, and only over a hold it may take", () => {
    const staleBefore = new Date("2026-09-11T06:00:00Z");
    expect(ticketMoveWhere("t1", TICKET_STATUSES.inProgress, "john@example.com", staleBefore)).toEqual({
      id: "t1",
      status: TICKET_STATUSES.inProgress,
      OR: [{ claimedBy: null }, { claimedBy: "john@example.com" }, { claimedAt: { lt: staleBefore } }],
    });
  });
});
