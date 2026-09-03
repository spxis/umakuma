import { describe, expect, it } from "vitest";

import { FEATURE_KINDS } from "./featureTimeline";
import {
  TICKET_STATUSES,
  isTicketStatus,
  openWishes,
  suggestedEntryId,
  toTicket,
  type Ticket,
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
