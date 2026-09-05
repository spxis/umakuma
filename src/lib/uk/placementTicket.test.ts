import { beforeAll, describe, expect, it } from "vitest";

import { createPlacementTicket, readPlacementTicket, type PlacementTicket } from "./placementTicket";

const NOW = new Date("2026-09-04T12:00:00.000Z");

const TICKET: PlacementTicket = {
  accountId: "acc_1",
  history: [{ rung: 5, choiceCount: 2, asked: 8, correct: 8 }],
  rung: 10,
  choiceCount: 3,
  targetSubjectIds: [11, 22, 33],
  missedSubjectIds: [7],
};

beforeAll(() => {
  process.env.AUTH_SECRET ??= "placement-test-secret";
});

describe("the placement ticket", () => {
  it("comes back exactly as it went in", () => {
    const token = createPlacementTicket(TICKET, NOW);
    expect(readPlacementTicket(token, "acc_1", NOW)).toEqual(TICKET);
  });

  it("does not show the right answers to whoever holds it", () => {
    /* The body is signed, not encrypted, so this is not a secrecy claim about
       the string - it is a check that the ids are not sitting in it in a form
       a page could read without decoding, and a reminder of why the client is
       never handed the targets separately. */
    const token = createPlacementTicket(TICKET, NOW);
    expect(token).not.toContain("targetSubjectIds");
  });

  it("refuses a ticket whose body has been edited", () => {
    const token = createPlacementTicket(TICKET, NOW);
    const [issuedAt, payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...TICKET, history: [{ rung: 75, choiceCount: 4, asked: 8, correct: 8 }] }),
      "utf8",
    ).toString("base64url");
    expect(readPlacementTicket(`${issuedAt}.${forged}.${signature}`, "acc_1", NOW)).toBeNull();
    expect(readPlacementTicket(`${issuedAt}.${payload}.${"0".repeat(64)}`, "acc_1", NOW)).toBeNull();
  });

  it("refuses a ticket issued to somebody else", () => {
    const token = createPlacementTicket(TICKET, NOW);
    expect(readPlacementTicket(token, "acc_2", NOW)).toBeNull();
  });

  it("refuses a ticket left sitting for hours", () => {
    const token = createPlacementTicket(TICKET, NOW);
    const later = new Date(NOW.getTime() + 3 * 60 * 60_000);
    expect(readPlacementTicket(token, "acc_1", later)).toBeNull();
  });

  it("refuses anything that is not a ticket", () => {
    expect(readPlacementTicket("", "acc_1", NOW)).toBeNull();
    expect(readPlacementTicket("nonsense", "acc_1", NOW)).toBeNull();
    expect(readPlacementTicket("a.b.c.d", "acc_1", NOW)).toBeNull();
  });
});
