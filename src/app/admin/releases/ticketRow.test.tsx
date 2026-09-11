import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TICKET_STATUSES, type Ticket } from "@/lib/tickets";

import TicketRow from "./TicketRow";

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

function wish(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "cuid123",
    title: "Dark mode should stick",
    detail: null,
    area: "platform",
    kind: "feature",
    status: TICKET_STATUSES.open,
    filedAs: null,
    requestedBy: "john@example.com",
    createdAt: "2026-09-02T10:00:00.000Z",
    claimedBy: null,
    claimedAt: null,
    ...overrides,
  };
}

function draw(value: Ticket): Document {
  return render(<TicketRow wish={value} endpoint="/api/admin/tickets" onChanged={() => undefined} />);
}

/*
 * The wish list is the one part of this page the site can write, and filing is
 * the one part it cannot: the timeline is a committed file. So a waiting wish
 * carries the command that moves it across, with its own id already in it.
 */
describe("a waiting wish", () => {
  const doc = draw(wish());

  it("shows the command that turns it into planned work", () => {
    /* `pnpm backlog file` was retired and exits non-zero saying so; the page
       kept telling John to run it for a week. */
    expect(doc.querySelector("code")?.textContent).toBe('pnpm task claim cuid123 "<who>"');
  });

  it("offers to decline rather than to delete", () => {
    const labels = [...doc.querySelectorAll("button")].map((el) => el.textContent);
    expect(labels).toContain("Decline");
    /* And the move that starts it, which is what a board is for. */
    expect(labels).toContain("Start");
    expect(labels).not.toContain("Delete");
  });

  it("says who asked", () => {
    expect(doc.body.textContent).toContain("john@example.com");
  });

  /*
   * A wish is an instant, not a calendar day. Slicing the ISO string showed
   * 2026-09-03 for a wish typed on the evening of the 2nd in Vancouver.
   */
  it("dates the wish in the reader's own zone", () => {
    const time = doc.querySelector("time");
    expect(time?.getAttribute("datetime")).toBe("2026-09-02T10:00:00.000Z");
    expect(time?.textContent).not.toBe("2026-09-02");
    expect(time?.textContent).toMatch(/Sep 2, 2026/);
  });
});

describe("a wish that has been answered", () => {
  it("names the entry it became, and stops offering the command", () => {
    const doc = draw(wish({ status: TICKET_STATUSES.filed, filedAs: "theme-preference-cookie" }));
    expect(doc.body.textContent).toContain("theme-preference-cookie");
    expect(doc.querySelector("code")).toBeNull();
  });

  it("can be reopened, because declining is not deleting", () => {
    const doc = draw(wish({ status: TICKET_STATUSES.declined }));
    expect([...doc.querySelectorAll("button")].map((el) => el.textContent)).toContain("Reopen");
  });
});

/*
 * The summary is the row's own control. A button inside it would be the
 * nested-interactive failure UnifiedExplorerCard was rebuilt to stop, so the
 * decline button lives in the disclosure body instead.
 */
describe("the row's controls", () => {
  it("keeps no control inside another", () => {
    const doc = draw(wish());
    expect(doc.querySelectorAll("summary button, button button, summary a")).toHaveLength(0);
  });
});

/*
 * Shipping is not a button. `release:take` writes the timeline entry and marks
 * the ticket in one pass so the two cannot drift; a "Mark shipped" here
 * produced a shipped ticket with nothing to point at.
 */
describe("a ticket somebody is working on", () => {
  const doc = draw(wish({ status: TICKET_STATUSES.inProgress, claimedBy: "umakuma-b6", claimedAt: "2026-09-11T12:00:00.000Z" }));
  const labels = [...doc.querySelectorAll("button")].map((el) => el.textContent);

  it("can be put back or declined, and not marked shipped", () => {
    expect(labels).toContain("Put back");
    expect(labels).toContain("Decline");
    expect(labels).not.toContain("Mark shipped");
  });

  it("says who holds it", () => {
    expect(doc.body.textContent).toContain("umakuma-b6");
  });
});
